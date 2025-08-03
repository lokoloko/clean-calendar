// Mock for isows module to fix Jest ESM issues
module.exports = {
  WebSocket: global.WebSocket || class MockWebSocket {
    constructor() {
      this.readyState = 1;
      this.close = jest.fn();
      this.send = jest.fn();
    }
  }
};