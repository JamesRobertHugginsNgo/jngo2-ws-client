const log = console.log.bind(console);

const startButton = document.getElementById('start');
const endButton = document.getElementById('end');
const localVideo = document.getElementById('local');
const connectionsDiv = document.getElementById('connections');

let webSocket;
let localStream;
const connections = {};

function clearConnectionsDiv() {
	log && log('CLEAR CONNECTIONS DIV');

	endButton.setAttribute('disabled', '');
	while (connectionsDiv.firstChild) {
		connectionsDiv.lastChild.remove();
	}
	startButton.removeAttribute('disabled');
}

function makeConnectionDiv(clientId) {
	log && log('MAKE CONNECTIONS DIV', clientId);

	const connectionDiv = connectionsDiv.appendChild(document.createElement('div'));
	connectionDiv.id = `connection-${clientId}`;
	const heading = connectionDiv.appendChild(document.createElement('h3'));
	heading.append(`Connection ${clientId}`);
	const video = connectionDiv.appendChild(document.createElement('video'));
	video.setAttribute('playsinline', '');
	video.setAttribute('autoplay', '');

	return connectionDiv;
}

function getConnectionDiv(clientId) {
	log && log('GET CONNECTIONS DIV', clientId);

	const connectionDiv = document.getElementById(`connection-${clientId}`);

	return connectionDiv;
}

function makeConnection(clientId) {
	log && log('MAKE CONNECTIONS', clientId);

	const rtcPeerConnection = new RTCPeerConnection({});

	rtcPeerConnection.addEventListener('icecandidate', (event) => {
		log && log('RTC PEER CONNECTION', 'ON', 'ICECANDIDATE');

		rtcPeerConnection.addIceCandidate(event.candidate);
	});

	rtcPeerConnection.addEventListener('track', (event) => {
		log && log('RTC PEER CONNECTION', 'ON', 'TRACK');

		const remoteVideo = document.querySelector(`#connection-${clientId} video`);
		remoteVideo.srcObject = event.streams[0];
	});

	for (const track of localStream.getTracks()) {
		rtcPeerConnection.addTrack(track, localStream);
	}

	connections[clientId] = { rtcPeerConnection };

	return rtcPeerConnection;
}

function getConnection(clientId) {
	log && log('GET CONNECTIONS', clientId);

	return connections[clientId].rtcPeerConnection;
}

function removeConnection(clientId) {
	log && log('REMOVE CONNECTIONS', clientId);

	const rtcPeerConnection = connections[clientId].rtcPeerConnection;

	delete connections[clientId];

	return rtcPeerConnection;
}

// ---
// START BUTTON ON CLICK
// ---

startButton.addEventListener('click', () => {
	log && log('START BUTTON', 'ON', 'CLICK');

	startButton.setAttribute('disabled', '');

	navigator.mediaDevices.getUserMedia({ audio: false, video: true }).then((stream) => {
		localStream = stream;
		localVideo.srcObject = localStream;

		webSocket = new WebSocket('wss://jngo2-ws-server.herokuapp.com');

		webSocket.onmessage = (event) => {
			log && log('WEB SOCKET', 'ONMESSAGE', event.data);

			try {
				const message = JSON.parse(event.data);
				const type = message.type;

				switch (type) {
					case 'Add Client': {
						log && log('WEB SOCKET', 'ONMESSAGE', 'Add Client');

						const clientId = message.clientId;
						const rtcPeerConnection = makeConnection(clientId);

						rtcPeerConnection.createOffer({
							offerToReceiveAudio: 1,
							offerToReceiveVideo: 1
						}).then((offer) => {
							return rtcPeerConnection.setLocalDescription(offer).then(() => {
								const connectionDiv = makeConnectionDiv(clientId);
								const paragraph = connectionDiv.appendChild(document.createElement('p'));
								paragraph.append(`Offer: ${offer}`);

								const newMessage = JSON.stringify({
									type: 'Set Offer',
									targetClientId: clientId,
									offer
								});
								log && log('WEB SOCKET', 'ONMESSAGE', 'newMessage', newMessage);

								webSocket.send(newMessage);
							});
						});

						break;
					}

					case 'Set Offer': {
						log && log('WEB SOCKET', 'ONMESSAGE', 'Set Offer');

						const { sourceClientId, offer } = message;
						const rtcPeerConnection = makeConnection(sourceClientId);

						rtcPeerConnection.setRemoteDescription(offer).then(() => {
							return rtcPeerConnection.createAnswer().then((answer) => {
								return rtcPeerConnection.setLocalDescription(answer).then(() => {
									const connectionDiv = makeConnectionDiv(sourceClientId);
									const paragraph1 = connectionDiv.appendChild(document.createElement('p'));
									paragraph1.append(`Offer: ${offer}`);
									const paragraph2 = connectionDiv.appendChild(document.createElement('p'));
									paragraph2.append(`Answer: ${answer}`);

									const newMessage = JSON.stringify({
										type: 'Set Answer',
										targetClientId: sourceClientId,
										answer
									});
									log && log('WEB SOCKET', 'ONMESSAGE', 'newMessage', newMessage);

									webSocket.send(newMessage);
								});
							});
						});

						break;
					}

					case 'Set Answer': {
						log && log('WEB SOCKET', 'ONMESSAGE', 'Set Answer');

						const { sourceClientId, answer } = message;

						const rtcPeerConnection = getConnection(sourceClientId);
						rtcPeerConnection.setRemoteDescription(answer).then(() => {
							const connectionDiv = getConnectionDiv(sourceClientId);
							const paragraph = connectionDiv.appendChild(document.createElement('p'));
							paragraph.append(`Answer: ${answer}`);
						});

						break;
					}

					case 'Remove Client': {
						log && log('WEB SOCKET', 'ONMESSAGE', 'Remove Client');

						const clientId = message.clientId;

						if (connectionsDiv.childNodes.length === 1) {
							clearConnectionsDiv();
						} else {
							const connectionDiv = getConnectionDiv(clientId);
							connectionDiv && connectionDiv.remove();
						}

						const rtcPeerConnection = removeConnection(clientId);
						rtcPeerConnection.close();

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
});

// ---
// END BUTTON ON CLICK
// ---

endButton.addEventListener('click', () => {
	log && log('END BUTTON', 'ON', 'CLICK');

	webSocket.close();
	clearConnectionsDiv();

	for (const track of localStream.getTracks()) {
		track.stop();
	}
	localStream = null;
});
