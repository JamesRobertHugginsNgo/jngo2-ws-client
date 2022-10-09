const log = console.log.bind(console);

const startButton = document.getElementById('start');
const endButton = document.getElementById('end');
const connectionsDiv = document.getElementById('connections');

let webSocket;

function clearConnectionsDiv() {
	log && log('CLEAR CONNECTIONS DIV');

	endButton.setAttribute('disabled', '');
	while (connectionsDiv.firstChild) {
		connectionsDiv.lastChild.remove();
	}
	startButton.removeAttribute('disabled');
}

function makeConnectionDiv(clientId) {
	const connectionDiv = connectionsDiv.appendChild(document.createElement('div'));
	connectionDiv.id = `connection-${clientId}`;
	const heading = connectionDiv.appendChild(document.createElement('h3'));
	heading.append(`Connection ${clientId}`);

	return connectionDiv;
}

function getConnectionDiv(clientId) {
	const connectionDiv = document.getElementById(`connection-${clientId}`);

	return connectionDiv;
}

// ---
// START BUTTON ON CLICK
// ---

startButton.addEventListener('click', () => {
	log && log('START BUTTON', 'ON', 'CLICK');

	startButton.setAttribute('disabled', '');

	webSocket = new WebSocket('wss://jngo2-ws-server.herokuapp.com');

	webSocket.onmessage = (event) => {
		log && log('WEB SOCKET', 'ONMESSAGE', event.data);

		try {
			const message = JSON.parse(event.data);
			const type = message.type;

			log && log('WEB SOCKET', 'ONMESSAGE', 'type', type);

			switch (type) {
				case 'Add Client': {
					log && log('WEB SOCKET', 'ONMESSAGE', 'Add Client');

					const clientId = message.clientId;
					const order = Math.floor(Math.random() * 1000000);

					const connectionDiv = makeConnectionDiv(clientId);
					const paragraph = connectionDiv.appendChild(document.createElement('p'));
					paragraph.append(`Order: ${order}`);

					const newMessage = JSON.stringify({
						type: 'Set Order',
						targetClientId: clientId,
						order
					});
					log && log('WEB SOCKET', 'ONMESSAGE', 'newMessage', newMessage);

					webSocket.send(newMessage);

					break;
				}

				case 'Set Order': {
					log && log('WEB SOCKET', 'ONMESSAGE', 'Set Order');

					const sourceClientId = message.sourceClientId;
					const order = message.order;
					const answer = Math.floor(Math.random() * 1000000);

					const connectionDiv = makeConnectionDiv(sourceClientId);
					const paragraph1 = connectionDiv.appendChild(document.createElement('p'));
					paragraph1.append(`Order: ${order}`);
					const paragraph2 = connectionDiv.appendChild(document.createElement('p'));
					paragraph2.append(`Answer: ${answer}`);

					const newMessage = JSON.stringify({
						type: 'Set Answer',
						targetClientId: sourceClientId,
						answer
					});
					log && log('WEB SOCKET', 'ONMESSAGE', 'newMessage', newMessage);

					webSocket.send(newMessage);

					break;
				}

				case 'Set Answer': {
					log && log('WEB SOCKET', 'ONMESSAGE', 'Set Answer');

					const sourceClientId = message.sourceClientId; // TODO: Replace with WebRTC peer to peer connection
					const answer = message.answer;

					const connectionDiv = getConnectionDiv(sourceClientId);
					const paragraph = connectionDiv.appendChild(document.createElement('p'));
					paragraph.append(`Answer: ${answer}`);

					break;
				}

				// TODO: Replace with WebRTC peer to peer connection
				case 'Remove Client': {
					log && log('WEB SOCKET', 'ONMESSAGE', 'Remove Client');

					const clientId = message.clientId;

					if (connectionsDiv.childNodes.length === 1) {
						clearConnectionsDiv();
					} else {
						const connectionDiv = getConnectionDiv(clientId);
						connectionDiv && connectionDiv.remove();
					}

					break;
				}
			}
		} catch (error) {
			log && log('WEB SOCKET', 'ONMESSAGE', 'error', error);
		}
	};

	webSocket.onclose = () => {
		log && log('WEB SOCKET', 'ONCLOSE');

		clearConnectionsDiv();
	};

	endButton.removeAttribute('disabled');
});

// ---
// END BUTTON ON CLICK
// ---

endButton.addEventListener('click', () => {
	log && log('END BUTTON', 'ON', 'CLICK');

	webSocket.close();
	clearConnectionsDiv();
});
