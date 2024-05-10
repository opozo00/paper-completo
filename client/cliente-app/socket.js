import io from 'socket.io-client';
//ESTA ES LA DIRECCIÓN EN EL DEPA
//const socket = io('ws://192.168.200.11:3003', { transports: ['websocket'] }); //En la direccion del socket no usar localhost en EXPO
const socket = io('ws://192.168.200.8:3003', { transports: ['websocket'] }); //En la direccion del socket no usar localhost en EXPO
//const socket = io('ws://192.168.1.29:3003', { transports: ['websocket'] }); //En la direccion del socket no usar localhost en EXPO


//const socket = io('ws://172.20.10.7:3003', { transports: ['websocket'] }); //En la direccion del socket no usar localhost en EXPO

//ESTA ES LA DIRECCIÓN EN LA UEES
//const socket = io('ws://10.2.120.126:3003', { transports: ['websocket'] }); //En la direccion del socket no usar localhost en EXPO
//10.2.111.144

export default socket;