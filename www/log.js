const log = console.log.bind(console);

const startButton = document.getElementById('start');
const endButton = document.getElementById('end');
const logsDiv = document.getElementById('logs');

let webSocket;

function clearLogsDiv() {
	log && log('CLEAR LOGS DIV');

	endButton.setAttribute('disabled', '');
	while (logsDiv.firstChild) {
		logsDiv.lastChild.remove();
	}
	startButton.removeAttribute('disabled');
}

// ---
// START BUTTON ON CLICK
// ---

startButton.addEventListener('click', () => {
	log && log('START BUTTON', 'ON CLICK');

	startButton.setAttribute('disabled', '');

	webSocket = new WebSocket('wss://jngo2-ws-server.herokuapp.com');

	webSocket.onmessage = (event) => {
		log && log('WEB SOCKET', 'ONMESSAGE', event.data);

		try {
			const message = JSON.parse(event.data);
			const type = message.type;

			switch (type) {
				case 'Add Log': {
					const args = message.args;

					const paragraph = logsDiv.appendChild(document.createElement('p'));
					paragraph.append(JSON.stringify(args));

					break;
				}
			}
		} catch (error) {
			log && log('WEB SOCKET', 'ONMESSAGE', 'error', error);
		}
	};

	webSocket.onclose = () => {
		log && log('WEB SOCKET', 'ONCLOSE');

		clearLogsDiv();
	};

	endButton.removeAttribute('disabled');
});

// ---
// END BUTTON ON CLICK
// ---

endButton.addEventListener('click', () => {
	log && log('END BUTTON', 'ON CLICK');

	webSocket.close();
	clearLogsDiv();
});
