const localVideo = document.getElementById('local');
const startButton = document.getElementById('start');
const endButton = document.getElementById('end');
const connectionsDiv = document.getElementById('connections');

let webSocket;
let pingInterval;

const clients = {};

let localStream;

// -----
// CONNECTION ELEMENTS
// -----

function createConnectionElements(clientId) {
	const main = connectionsDiv.appendChild(document.createElement('div'));

	const heading = main.appendChild(document.createElement('h3'));
	heading.append(`Connection ${clientId}`);

	const videoParagraph = main.appendChild(document.createElement('p'));
	const video = videoParagraph.appendChild(document.createElement('video'));
	video.setAttribute('playsinline', '');
	video.setAttribute('autoplay', '');

	const metaParagraph = main.appendChild(document.createElement('p'));

	return { main, video, metaParagraph };
}

function removeConnectionElements(elements) {
	elements.main.remove();
}

// -----
// CONNECTION
// -----

function createRtcPeerConnection(elements, to) {
	const rtcPeerConnection = new RTCPeerConnection({});

	rtcPeerConnection.addEventListener('icecandidate', (event) => {
		console.log('RTC PEER CONNECTION ON ICE CANDIDATE', event.candidate);

		// rtcPeerConnection.addIceCandidate(event.candidate);

		webSocket.send(JSON.stringify({
			to,
			type: 'Candidate',
			candidate: event.candidate
		}));
	});

	rtcPeerConnection.addEventListener('iceconnectionstatechange', (event) => {
		console.log('RTC PEER CONNECTION ON ICE CONNECTION STATE CHANGE', event.streams);
	});

	rtcPeerConnection.addEventListener('track', (event) => {
		console.log('RTC PEER CONNECTION ON TRACK', event.streams);

		if (elements.video.srcObject !== event.streams[0]) {
			elements.video.srcObject = event.streams[0];
		}
	});

	for (const track of localStream.getTracks()) {
		rtcPeerConnection.addTrack(track, localStream);
	}

	return rtcPeerConnection;
}

// -----
// ADD EVENT LISTENER
// -----

startButton.addEventListener('click', () => {
	console.log('START BUTTON ON CLICK');

	startButton.setAttribute('disabled', '');

	if (webSocket) {
		webSocket.close();
		webSocket = null;
	}

	navigator.mediaDevices.getUserMedia({ audio: false, video: true }).then((stream) => {
		localStream = stream;
		localVideo.srcObject = localStream;

		webSocket = new WebSocket('wss://jngo2-ws-server.herokuapp.com');

		webSocket.onmessage = (event) => {
			console.log('WEB SOCKET ON MESSAGE');

			try {
				const message = JSON.parse(event.data);
				console.log('WEB SOCKET ON MESSAGE - MESSAGE', message);

				switch (message.type) {
					case 'Add': {
						const elements = createConnectionElements(message.from);

						const rtcPeerConnection = createRtcPeerConnection(elements, message.from);
						rtcPeerConnection.createOffer({
							offerToReceiveAudio: 1,
							offerToReceiveVideo: 1
						}).then((offer) => {
							return rtcPeerConnection.setLocalDescription(offer).then(() => {
								elements.metaParagraph.append(`Offer: ${offer}`);

								webSocket.send(JSON.stringify({
									to: message.from,
									type: 'Offer',
									offer
								}));

								clients[message.from] = {
									offer,
									elements,
									rtcPeerConnection
								};
							});
						});

						break;
					}

					case 'Offer': {
						const elements = createConnectionElements(message.from);
						elements.metaParagraph.append(`Offer: ${message.offer}`);

						const rtcPeerConnection = createRtcPeerConnection(elements, message.from);
						rtcPeerConnection.setRemoteDescription(message.offer).then(() => {
							return rtcPeerConnection.createAnswer().then((answer) => {
								return rtcPeerConnection.setLocalDescription(answer).then(() => {
									elements.metaParagraph.append(document.createElement('br'), `Answer: ${answer}`);

									webSocket.send(JSON.stringify({
										to: message.from,
										type: 'Answer',
										answer
									}));

									clients[message.from] = {
										offer: message.offer,
										answer,
										elements,
										rtcPeerConnection
									};
								});
							});
						});

						break;
					}

					case 'Answer': {
						clients[message.from].elements.metaParagraph.append(document.createElement('br'), `Answer: ${message.answer}`);
						clients[message.from].rtcPeerConnection.setRemoteDescription(message.answer);
						break;
					}

					case 'Candidate': {
						clients[message.from].elements.metaParagraph.append(document.createElement('br'), `Candidate: ${message.candidate}`);
						clients[message.from].rtcPeerConnection.addIceCandidate(message.candidate);
						break;
					}

					case 'Remove': {
						removeConnectionElements(clients[message.from].elements);
						clients[message.from].rtcPeerConnection.close();
						delete clients[message.from];
						break;
					}
				}
			} catch (error) {
				// Do nothing
			}
		};

		webSocket.onclose = () => {
			console.log('WEB SOCKET ON CLOSE');

			if (pingInterval) {
				clearInterval(pingInterval);
				pingInterval = null;
			}

			for (const track of localStream.getTracks()) {
				track.stop();
			}
			localStream = null;

			for (const key in clients) {
				removeConnectionElements(clients[key].elements);
				delete clients[key];
			}

			endButton.setAttribute('disabled', '');
			startButton.removeAttribute('disabled');
		};

		endButton.removeAttribute('disabled');

		pingInterval = setInterval(() => {
			console.log('PING INTERVAL');

			webSocket.send(JSON.stringify({
				type: 'Ping'
			}));
		}, 10000);
	});
});

endButton.addEventListener('click', () => {
	console.log('END BUTTON ON CLICK');

	webSocket.close();
	webSocket = null;
});
