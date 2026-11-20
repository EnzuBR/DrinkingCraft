import net from 'node:net';

const SERVERDATA_RESPONSE_VALUE = 0;
const SERVERDATA_EXECCOMMAND = 2;
const SERVERDATA_AUTH = 3;
const SERVERDATA_AUTH_RESPONSE = 2;

export class RconClient {
  constructor({ host = '127.0.0.1', port = 25579, password = '', timeoutMs = 10000 } = {}) {
    this.host = host;
    this.port = port;
    this.password = password;
    this.timeoutMs = timeoutMs;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map();
    this.queue = Promise.resolve();
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;

    await new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: this.host, port: this.port });
      sock.setNoDelay(true);
      this.socket = sock;

      const onError = (err) => {
        sock.destroy();
        this.socket = null;
        reject(err);
      };

      sock.once('error', onError);
      sock.once('connect', () => {
        sock.removeListener('error', onError);
        sock.on('data', (chunk) => this._onData(chunk));
        sock.on('error', (err) => this._onSocketError(err));
        sock.on('close', () => {
          this.connected = false;
          for (const [, entry] of this.pending) {
            clearTimeout(entry.timer);
            if (entry.flushTimer) clearTimeout(entry.flushTimer);
            entry.reject(new Error('RCON socket closed before response'));
          }
          this.pending.clear();
        });
        resolve();
      });
    });

    const authId = this._allocId();
    const authRes = await this._sendPacketAndWait(authId, SERVERDATA_AUTH, this.password);
    if (authRes.id === -1) {
      this.close();
      throw new Error('RCON authentication failed (invalid password)');
    }
    this.connected = true;
  }

  _allocId() {
    this.nextId = (this.nextId % 0x7ffffff0) + 1;
    return this.nextId;
  }

  _encodePacket(id, type, payload) {
    const body = Buffer.from(payload, 'utf8');
    const packetLen = 4 + 4 + body.length + 2;
    const buf = Buffer.alloc(4 + packetLen);
    buf.writeInt32LE(packetLen, 0);
    buf.writeInt32LE(id, 4);
    buf.writeInt32LE(type, 8);
    body.copy(buf, 12);
    buf.writeUInt8(0, 12 + body.length);
    buf.writeUInt8(0, 13 + body.length);
    return buf;
  }

  _onSocketError(err) {
    this.connected = false;
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      if (entry.flushTimer) clearTimeout(entry.flushTimer);
      entry.reject(err);
    }
    this.pending.clear();
  }

  _onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 4) {
      const len = this.buffer.readInt32LE(0);
      if (len < 10 || len > 4096 * 16) {
        this.buffer = Buffer.alloc(0);
        throw new Error(`Invalid RCON packet length: ${len}`);
      }
      if (this.buffer.length < 4 + len) break;

      const id = this.buffer.readInt32LE(4);
      const type = this.buffer.readInt32LE(8);
      const payloadEnd = 4 + len - 2;
      const payload = this.buffer.subarray(12, payloadEnd).toString('utf8');
      this.buffer = this.buffer.subarray(4 + len);

      this._handlePacket({ id, type, payload });
    }
  }

  _handlePacket(packet) {
    if (packet.id === -1) {
      for (const [id, entry] of this.pending) {
        if (entry.isAuth) {
          clearTimeout(entry.timer);
          this.pending.delete(id);
          entry.resolve(packet);
          return;
        }
      }
      return;
    }

    const entry = this.pending.get(packet.id);
    if (!entry) return;

    if (entry.isAuth) {
      if (packet.type === SERVERDATA_AUTH_RESPONSE) {
        clearTimeout(entry.timer);
        this.pending.delete(packet.id);
        entry.resolve(packet);
      }
      return;
    }

    if (packet.type === SERVERDATA_RESPONSE_VALUE) {
      entry.chunks.push(packet.payload);
      if (entry.flushTimer) clearTimeout(entry.flushTimer);

      // Vanilla Minecraft RCON splits responses > ~4082 bytes across packets.
      // Single-packet responses resolve immediately; near-max chunks wait briefly for follow-up fragments.
      if (Buffer.byteLength(packet.payload, 'utf8') < 3800) {
        clearTimeout(entry.timer);
        this.pending.delete(packet.id);
        entry.resolve(entry.chunks.join(''));
      } else {
        entry.flushTimer = setTimeout(() => {
          clearTimeout(entry.timer);
          this.pending.delete(packet.id);
          entry.resolve(entry.chunks.join(''));
        }, 40);
      }
    }
  }

  _sendPacketAndWait(id, type, payload) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RCON auth timeout after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      this.pending.set(id, {
        isAuth: true,
        timer,
        flushTimer: null,
        resolve,
        reject,
      });

      this.socket.write(this._encodePacket(id, type, payload));
    });
  }

  send(command, timeoutMs = this.timeoutMs) {
    const task = this.queue.then(() => this._sendSingle(command, timeoutMs));
    this.queue = task.catch(() => {});
    return task;
  }

  _sendSingle(command, timeoutMs) {
    if (!this.socket || !this.connected) {
      return Promise.reject(new Error('RCON is not connected'));
    }

    const cmdId = this._allocId();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(cmdId);
        reject(new Error(`RCON command timeout (${timeoutMs}ms): ${command}`));
      }, timeoutMs);

      this.pending.set(cmdId, {
        isAuth: false,
        chunks: [],
        timer,
        flushTimer: null,
        resolve,
        reject,
      });

      // Minecraft's RconClient requires 1 TCP packet per read; never write two packets back-to-back
      this.socket.write(this._encodePacket(cmdId, SERVERDATA_EXECCOMMAND, command));
    });
  }

  close() {
    this.connected = false;
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {
        // ignore
      }
      this.socket = null;
    }
  }
}
