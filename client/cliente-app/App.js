import { Text, View, Button, StyleSheet, FlatList, SafeAreaView, Alert, StatusBar, ScrollView } from 'react-native';
import socket from '../cliente-app/socket';
import { useEffect, useState, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';


export default function App() {
  const [newSocket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState();
  const [recordings, setRecordings] = useState([]);
  const [transcriptions, setTranscriptions] = useState([]);
  const [diarization, setDiarization] = useState([]);
  const [shouldContinueRecording, setshouldContinueRecording] = useState(true);
  const [contador, setContador] = useState();

  useEffect(() => {
    setSocket(socket);
    socket.on('connection', (csocket) => {
      console.log('Cliente conectado ' + csocket);
    });

    socket.on('connect_error', (err) => {
      setError('Error connecting to the server: ' + err.message);
    });

    // socket.on('transcription', (transcript) => {
    //   setTranscriptions((prevTranscriptions) => {
    //     const updatedTranscriptions = [...prevTranscriptions, transcript];
    //     const combinedTranscript = updatedTranscriptions.join('\n');
    //     return combinedTranscript;
    //   });
    // });
    socket.on('transcription', (transcript) => {
      setTranscriptions((prevTranscriptions) => [...prevTranscriptions, transcript]);
    });
    socket.on('diarization', (data) => {
      setDiarization((prevData) => [...prevData, data])
      // setDiarization(data);
      // console.log(data);
    });

    return () => {
      socket.close();
    };
  }, []);

  async function loopRecording() {
    if (isRecording || !shouldContinueRecording) { // Si ya se está grabando, no hacer nada
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } else {
        console.log("Permisos de grabación no concedidos"); // Mensaje si no se pudo iniciar la grabación por error en los permisos
      }
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      socket.emit('startRecording');
      await new Promise(resolve =>
        setContador(setTimeout(resolve, 10000))
      ); // Esperar 10 segundos
      if (!shouldContinueRecording) {
        return;
      }
      //(await recording.getStatusAsync()).isDoneRecording
      //recording.getStatusAsync();
      await recording.stopAndUnloadAsync(); // Detener la grabación
      const uri = recording.getURI();
      const audioFile2 = await convertToBinary(uri);
      socket.emit('audio', audioFile2); // Enviar la grabación
    } catch (error) {
      console.error("Error al grabar o enviar la grabación:", error);
    } finally {
      setIsRecording(false); // Indicar que la grabación se ha detenido
      if (shouldContinueRecording) {
        loopRecording(); // Iniciar una nueva grabación
      }
    }
  };

  async function stopRecording() {
    try {
      clearTimeout(contador);//Se detiene el TimeOut para que no entre en loop
      setshouldContinueRecording(false);
      setIsRecording(false);
      if (recording) {
        const status = await recording.getStatusAsync();
        if (!status.isDoneRecording) {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          const audioFile2 = await convertToBinary(uri);
          socket.emit('audio', audioFile2);
          socket.emit('stopRecording');
          //setRecording(null);
        }
        setRecording(null);
      }
      socket.emit('endRecording');
      //socket.emit('endRecording');
      // if (recording) {
      //   setshouldContinueRecording(false);
      //   setIsRecording(false);
      //   await recording.stopAndUnloadAsync();
      //   setRecording(undefined);
      //   const uri = recording.getURI();
      //   const audioFile2 = await convertToBinary(uri);
      //   socket.emit('audio', audioFile2);
      //   socket.emit('stopRecording');
      // }
    } catch (error) {
      console.error("Error al detener la grabación:", error);
    }
  };

  async function convertToBinary(uri) {
    try {
      const data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return data;
    } catch (err) {
      console.log('Error al convertir a binario ', err);
      return null;
    }
  }
  function getDurationFormatted(milliseconds) {
    const minutes = milliseconds / 1000 / 60;
    const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
    return seconds < 10 ? `${Math.floor(minutes)}:0${seconds}` : `${Math.floor(minutes)}:${seconds}`
  }

  function getRecordingLines() {
    return recordings.map((recordingLine, index) => {
      return (
        <View key={index} style={styles.row}>
          <Text style={styles.fill}>
            Recording #{index + 1} | {recordingLine.duration}
          </Text>
          <Button onPress={() => recordingLine.sound.replayAsync()} title="Play"></Button>
        </View>
      );
    });
  }

  function clearRecordings() {
    setRecordings([])
  }

  return (
    <SafeAreaView style={styles.container}>
      {error && <Text style={styles.error}>Error: {error}</Text>}
      <View style={styles.content}>
        <View style={styles.buttonContainer}>
          <Button
            title="Start Recording"
            onPress={loopRecording}
            disabled={isRecording}
          />
          <Button
            title="Stop Recording"
            onPress={stopRecording}
            disabled={!isRecording}
          />
        </View>
        {getRecordingLines()}
        <View style={styles.buttonContainer}><Button title={recordings.length > 0 ? '\n\n\nClear Recordings' : ''} onPress={(clearRecordings)} /></View>


        <View style={styles.transcriptionsContainer}>
          <Text style={styles.heading}>Transcripciones de Audio</Text>
          <FlatList
            data={transcriptions}
            renderItem={({ item }) => <Text>{item}</Text>}
            keyExtractor={(item, index) => index.toString()}
          />
          <Text style={styles.heading}>Cantidad de hablantes en el audio: </Text>
          <FlatList
            style={styles.transcriptionText}
            data={Object.entries(diarization)}
            renderItem={({ item }) => <Text>{`${item[0]}: ${JSON.stringify(item[1])}`}</Text>}
            keyExtractor={(item, index) => index.toString()}
          // data={diarization}
          // renderItem={({ item }) => <Text>{item}</Text>}
          // keyExtractor={(item, index) => index.toString()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight,
  },
  content: {
    flex: 1,

  },
  buttonContainer: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  transcriptionsContainer: {
    marginTop: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 40
  },
  fill: {
    flex: 1,
    margin: 15
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
});
