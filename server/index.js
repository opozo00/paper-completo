const { exec, spawn } = require('child_process');
const express = require('express');
const { createServer } = require('http');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config()
const { OpenAI } = require("openai");
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const PORT = 3003;
const app = express();
app.use(cors());
const server = createServer(app);

const io = new Server(server, {
    cors: {
        //origin: "http://localhost:3000",
        //origin: "*",
        methods: ["GET", "POST"],
    },
});

//const API_KEYS = [process.env.OPENAI_APIKEY, process.env.OPENAI_APIKEY, process.env.OPENAI_APIKEY];

const openai = new OpenAI({ apikey: process.env.OPENAI_APIKEY });
let recording = false;
//const audioFolderPath = path.join(__dirname, 'wav');
var resultado;
var segments;
var transcripciones_json;
let audioBuffer = [];
let bufferLength = 0;
const tenSeconds = 10 * 44100 * 2; // 10 seconds of audio at 44.1kHz and 16-bit depth
let queue = [];
const sessionPath = path.join(__dirname, 'wav', `session_${Date.now()}`);
var outputFile;
fs.mkdir(sessionPath, { recursive: true }, (err) => {
    if (err) throw err;
});


io.on('connection', (socket) => {
    console.log('a user connected: ' + socket.id);
    socket.on('startRecording', () => {
        if (!recording) {
            recording = true;
            console.log('Grabación iniciada');
        }
    });

    socket.on('audio', async (data) => {

        const buffer = Buffer.from(data, 'base64');
        // console.log(typeof buffer);
        // console.log(buffer);
        // audioBuffer.push(buffer);
        // bufferLength += buffer.length;
        // if (bufferLength >= tenSeconds) {
        //     const fileName = `audio_${Date.now()}.wav`;
        //     const filePath = path.join(__dirname, 'temp', fileName);
        //     const finalPath = path.join(__dirname, 'wav', fileName);

        //     const tenSecondsBuffer = Buffer.concat(audioBuffer);
        //     audioBuffer = [];
        //     bufferLength = 0;

        //     const writeFilePromise = new Promise((resolve, reject) => {
        //         fs.writeFile(filePath, tenSecondsBuffer, 'binary', (err) => {
        //             if (err) {
        //                 reject(err);
        //             } else {
        //                 console.log('Audio saved:', fileName);
        //                 resolve(filePath); // Resuelve la promesa con la ruta del archivo
        //             }
        //         });
        //     });
        //     try {
        //         // Esperar a que se resuelva la promesa antes de continuar
        //         const savedFilePath = await writeFilePromise;
        //         //Convertir a wav
        //         const wavFilePath = await convertToWav(savedFilePath, `${finalPath}.wav`);

        //         // // Añadir el nombre del archivo a la cola
        //         // queue.push(wavFilePath);

        //         // // Procesar los archivos de la cola uno por uno
        //         // while (queue.length > 0) {
        //         //     const filePath = queue.shift();
        //         //     try {
        //         //         const whisper = await transcribe(filePath);
        //         //         const transcription = whisper.text;
        //         //         segments = whisper.segments;
        //         //         console.log(segments);

        //         //         console.log("Esta es la transcripción del audio >>> " + transcription);

        //         //         // emitir la transcripción
        //         //         socket.emit('transcription', transcription);

        //         //     } catch (error) {
        //         //         console.error("Error al transcribir el archivo de audio:", error);
        //         //         // Si hay un error, añadir el archivo de nuevo a la cola para reintentar más tarde
        //         //         queue.push(filePath);
        //         //         break;
        //         //     }
        //         // }

        //     } catch (error) {
        //         console.error("Error al transcribir el archivo de audio:", error);
        //     }
        // }
        const fileName = `audio_${Date.now()}.wav`;
        const filePath = path.join(__dirname, 'temp', fileName);
        //const finalPath = path.join(__dirname, 'wav', fileName);
        const finalPath = path.join(sessionPath, fileName);

        const writeFilePromise = new Promise((resolve, reject) => {
            fs.writeFile(filePath, buffer, 'binary', (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Audio saved:', fileName);
                    resolve(filePath); // Resuelve la promesa con la ruta del archivo
                }
            });
        });

        try {
            // Esperar a que se resuelva la promesa antes de continuar
            const savedFilePath = await writeFilePromise;
            //Convertir a wav
            const wavFilePath = await convertToWav(savedFilePath, `${finalPath}.wav`);

            // // Transcribir el archivo una vez que se haya guardado completamente
            const whisper = await transcribe(wavFilePath);
            const transcription = whisper.text;
            segments = whisper.segments;
            console.log(segments);

            //console.log("Esta es la transcripción del audio >>> " + transcription);

            // emitir la transcripción
            socket.emit('transcription', transcription);

        } catch (error) {
            console.error("Error al transcribir el archivo de audio:", error);
        }


        // try {
        //     // Ruta al script de Python
        //     const pythonScriptPath = '../script/script.py';
        //     // Crear un nuevo proceso hijo usando spawn
        //     const pythonProcess = spawn('python', [pythonScriptPath, `${fileName}.wav`, JSON.stringify(segments)]);

        //     // Escuchar la salida del script de Python
        //     pythonProcess.stdout.on('data', async (data) => {
        //         resultado = JSON.parse(data);
        //         console.log(`Datos del script de Python: ${data}`);
        //         transcripciones_json = resultadoPython(resultado);
        //         socket.emit('diarization', transcripciones_json);
        //     });
        //     // Escuchar los errores del script de Python
        //     pythonProcess.stderr.on('data', (data) => {
        //         console.error(`Error del script de Python: ${data}`);
        //     });
        // } catch (err) {
        //     console.log('Este fue el error que sucedio al que segmentar los hablantes: ', err);
        // }
    });

    socket.on('stopRecording', async () => {
        if (recording) {
            recording = false;
            console.log('Grabación detenida');
        }
    });

    // socket.on('endRecording', async () => {
    //     fs.readdir(sessionPath, async (err, files) => {
    //         if (err) {
    //             console.log('Error al leer la carpeta de audios: ', err);
    //             return;
    //         }
    //         //Filtrar solo archivos .wav
    //         const wavFiles = files.filter(file => file.endsWith('.wav'));
    //         const audioFiles = wavFiles.map(file => path.join(sessionPath, file));
    //         //Merge audios
    //         //const outputFile = path.join(__dirname, 'merge', `output_${Date.now()}.wav`); //Ruta del archivo de audio final
    //         name = `output_${Date.now()}.wav`

    //         //outputFile = path.join(__dirname, 'merge', `output_${Date.now()}.wav`); //Ruta del archivo de audio final
    //         outputFile = path.join(__dirname, 'merge', name); //Ruta del archivo de audio final
    //         await mergeAudioFiles(audioFiles, outputFile)
    //             .then(outputFile => {
    //                 console.log('Archivos de audio unidos exitosamente: ', outputFile);
    //             })
    //             .catch(error => {
    //                 console.error('Error al unir los archivos de audio: ', error);
    //             })
    //     })
    //     try {
    //         // Ruta al script de Python
    //         const pythonScriptPath = '../script/script.py';
    //         // Crear un nuevo proceso hijo usando spawn
    //         //const pythonProcess = spawn('python', [pythonScriptPath, outputFile]);
    //         console.log('NAME >>>', name);
    //         const pythonProcess = spawn('python', [pythonScriptPath, name]);

    //         // Escuchar la salida del script de Python
    //         pythonProcess.stdout.on('data', async (data) => {
    //             resultado = JSON.parse(data);
    //             console.log(`Datos del script de Python: ${data}`);
    //             transcripciones_json = resultadoPython(resultado);
    //             socket.emit('diarization', transcripciones_json);
    //         });
    //         // Escuchar los errores del script de Python
    //         pythonProcess.stderr.on('data', (data) => {
    //             console.error(`Error del script de Python: ${data}`);
    //         });
    //     } catch (err) {
    //         console.log('Este fue el error que sucedio al querer segmentar los hablantes: ', err);
    //     }
    // })
    socket.on('endRecording', async () => {
        fs.readdir(sessionPath, async (err, files) => {
            if (err) {
                console.log('Error al leer la carpeta de audios: ', err);
                return;
            }
            // Filtrar solo archivos .wav
            const wavFiles = files.filter(file => file.endsWith('.wav'));
            const audioFiles = wavFiles.map(file => path.join(sessionPath, file));

            try {
                // Genera un nombre único para el archivo de salida
                const name = `output_${Date.now()}.wav`;
                const outputFile = path.join(__dirname, 'merge', name); // Ruta del archivo de audio final

                // Fusiona los archivos de audio
                await mergeAudioFiles(audioFiles, outputFile);
                console.log('Archivos de audio unidos exitosamente: ', outputFile);

                // Ruta al script de Python
                const pythonScriptPath = '../script/script.py';
                // Crea un nuevo proceso hijo usando spawn
                const pythonProcess = spawn('python', [pythonScriptPath, name]);

                // Escucha la salida del script de Python
                pythonProcess.stdout.on('data', async (data) => {
                    resultado = JSON.parse(data);
                    console.log(`Datos del script de Python: ${data}`);
                    transcripciones_json = resultadoPython(resultado);
                    socket.emit('diarization', transcripciones_json);
                });
                // Escucha los errores del script de Python
                pythonProcess.stderr.on('data', (data) => {
                    console.error(`Error del script de Python: ${data}`);
                });
            } catch (err) {
                console.log('Este fue el error que sucedió al querer segmentar los hablantes: ', err);
            }
        });
    });


    /*
    El proceso será que cada Fragmento de Audio de 10 segundos se guardará
    en una carpeta única por cada Grabación Principal. Dentro de esta carpeta
    estarán los Fragmetos de Audio a Combinar, para formar un solo archivo
    de audio. Se usará FFMPEG para poder hacer el Merge. Una vez se cuente 
    con un solo archivo de audio, se le realizará el proceso de diarización
    y se lo enviará al cliente. Los pasos serán los siguientes:
    1. Se recibirán los fragmetos de audio de 10 segundos en el servidor
    2. Se guardará cada fragmento de audio recibido en el servidor y se lo
    convertirá en formato .wav
    3. Cuando la grabación desde el cliente finalice completamente, se llama
    al evento 'endRecording' para que desde el servidor lea todos los 
    fragmentos de audio creados en una carpeta y se combinen los combine 
    usando la función mergeAudioFiles()
    4. Después de combinar y conseguir un solo archivo de audio se debe
    realizar la diarización
    5. Devolver al cliente el resultado de la diarización con la
    transcripción por cada hablante.
    */

    socket.on('disconnect', () => {
        console.log('a user disconnected: ' + socket.id);
    });
});

async function transcribe(audio) {
    return await openai.audio.transcriptions.create({
        model: "whisper-1",
        language: "es",
        file: fs.createReadStream(audio),
        response_format: "verbose_json",
        timestamp_granularities: ["segment"]
    });
}

// Función para convertir el archivo de audio a WAV
function convertToWav(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
        //const command = `ffmpeg -i ${inputFilePath} -acodec pcm_s16le -ar 16000 ${outputFilePath}`;
        const command = `ffmpeg -i ${inputFilePath} -acodec pcm_s16le -ar 16000 -movflags faststart ${outputFilePath}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(outputFilePath);
            }
        });
    });
}

function resultadoPython(data) {
    //console.log('Esta variable es desde el servidor >>> ', data);
    return data;
}

function mergeAudioFiles(inputFiles, outputFile) {
    return new Promise((resolve, reject) => {
        const inputArgs = inputFiles.map(file => `-i ${file}`).join(' ');
        const command = `ffmpeg ${inputArgs} -filter_complex concat=n=${inputFiles.length}:v=0:a=1 -y ${outputFile}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(outputFile);
            }
        });
    });
}

server.listen(PORT, () => {
    console.log(`Socket server listening on port ${PORT}`);
});

// fs.readdir(audioFolderPath, async (err, files) => {
//     if (err) {
//         console.log('Error al leer la carpeta de audios: ', err);
//         return;
//     }
//     //Filtrar solo archivos .wav
//     const wavFiles = files.filter(file => file.endsWith('.wav'));
//     const audioFiles = wavFiles.map(file => path.join(audioFolderPath, file));
//     //Merge audios
//     const outputFile = path.join(__dirname, 'merge', `output_${Date.now()}.wav`); //Ruta del archivo de audio final
//     await mergeAudioFiles(audioFiles, outputFile)
//         .then(outputFile => {
//             console.log('Archivos de audio unidos exitosamente: ', outputFile);
//         })
//         .catch(error => {
//             console.error('Error al unir los archivos de audio: ', error);
//         })
// })

// return new Promise((resolve, reject) => {
//     const inputArgs = inputFiles.map(file => `-i "${file}"`).join(' ');
//     const command = `ffmpeg ${inputArgs} -filter_complex concat=n=${inputFiles.length}:v=0:a=1 -y "${outputFile}"`;
//     exec(command, (error, stdout, stderr) => {
//         if (error) {
//             reject(error);
//         } else {
//             resolve(outputFile);
//         }
//     });
// });