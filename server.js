const Http = require('http');
const NodeStatic = require('node-static');

const PORT = process.env.PORT || 90;

const log = console.log.bind(console);

const staticServer = new NodeStatic.Server('www', { cache: 0 });

// ---
// HTTP SERVER
// ---

const server = Http.createServer((request, response) => {
	staticServer.serve(request, response);
});
server.listen(PORT, () => {
	log && log('SERVER', `Listening to port ${PORT}`);
});
