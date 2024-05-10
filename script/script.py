import datetime
import sys
from pyannote.audio import Pipeline
import json
from dotenv import load_dotenv
import os
import torch
import whisper
import time

load_dotenv()
# Esperar hasta que el archivo de audio se haya creado completamente
max_wait_time = 60  # Tiempo máximo de espera en segundos
wait_interval = 1    # Intervalo de espera entre verificaciones en segundos
waited_time = 0
audio_file_path = sys.argv[1]
while audio_file_path == 'undefined':
    if waited_time >= max_wait_time:
        print(json.dumps("Error: La ruta se está enviando vacía"))
        sys.exit(1)
    time.sleep(wait_interval)
    waited_time += wait_interval

transcriptions_by_speaker = {}  # dictionary to store transcription for each speaker
epsilon = 0.8  # Ajusta esto según sea necesario
# directorio actual
current_directory = os.path.dirname(os.path.abspath(__file__))
# directorio hacia arriba desde el directorio actual
server_directory = os.path.abspath(os.path.join(current_directory, ".."))
# Unir la ruta del directorio 'server' con los subdirectorios y el nombre del archivo
audio = os.path.join(server_directory, "server", "merge", audio_file_path)
#Diarizacion
pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token=os.environ['HUGGIN_FACE_TOKEN'])

# send pipeline to GPU (when available)
pipeline.to(torch.device("cuda"))
diarization = pipeline(audio)
speakers = set() # number of speakers

#Transcripcion
model = whisper.load_model("base")
model.to(torch.device("cuda"))

def transcripcion (audioFile):
    result = model.transcribe(audioFile, fp16=False)
    return result

whisper_resultado = transcripcion(audio)
def transcribe_segments(respuesta):
    segmentos = respuesta['segments']
    return segmentos


segmentos = transcribe_segments(whisper_resultado)

#Sincronizar transcripcion y cantidad de hablantes
num_speakers = len(set(speaker for _, _, speaker in diarization.itertracks(yield_label=True)))


added_segments = set()

for turn, _, speaker in diarization.itertracks(yield_label=True):
    turn_transcription = ''
    for segment in segmentos:
        # Si solo hay un hablante, asigna todos los segmentos de transcripción a ese hablante
        if num_speakers == 1:
            # Solo añade la transcripción del segmento si no ha sido añadida antes
            if segment['text'] not in added_segments:
                turn_transcription += ' ' + segment['text']
                added_segments.add(segment['text'])
        else:
            # Calcula el solapamiento entre el turno y el segmento
            overlap = min(segment['end'], turn.end) - max(segment['start'], turn.start)
            # Si hay solapamiento, añade el texto del segmento a la transcripción del turno
            if overlap > 0 and segment['text'] not in added_segments:
                turn_transcription += ' ' + segment['text']
                added_segments.add(segment['text'])
    if speaker not in transcriptions_by_speaker:
        transcriptions_by_speaker[speaker] = []
    transcriptions_by_speaker[speaker].append(turn_transcription.strip())

# Convierte el diccionario a una cadena JSON
output_json = json.dumps(transcriptions_by_speaker)

# Imprime la cadena JSON
print(output_json)
# # Imprime las transcripciones de cada hablante
# for speaker, transcriptions in transcriptions_by_speaker.items():
#     print(json.dumps(f"{speaker}: {' '.join(transcriptions)}"))#esto se envía al servidor    #print(f"{speaker}: {' '.join(transcriptions)}")#esto se envía al servidor


num_speakers = len(transcriptions_by_speaker)


"""
Si el tiempo de inicio de la transcripcion
de voz no coincide con la diarizacion del habla
para un mismo hablante hacer que:
1. Si solo se reconoció un hablante en el audio asignar
todo el contenido de la transcripcion a ese 
hablante
    1.2.  
2. Imprimir el hablante reconocido con su texto
correspondiente completo

"""