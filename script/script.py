import datetime
import sys
from pyannote.audio import Pipeline
import json
from dotenv import load_dotenv
import os
import torch
import whisper
import asyncio

load_dotenv()
audio_file_path = sys.argv[1]   # primer argumento enviado desde el servidor
#segmentos = json.loads(sys.argv[2]) #segundo argumento enviador desde el servidor
transcriptions_by_speaker = {}  # dictionary to store transcription for each speaker
epsilon = 0.8  # Ajusta esto según sea necesario
# Ruta del archivo de audio
#C:/Users/Chelo/Desktop/UEES/practica-paper-final/server/merge
#audio = f"./merge/output_1711609454432.wav"
# ruta del archivo actual
current_directory = os.path.dirname(os.path.abspath(__file__))
# directorio hacia arriba desde el directorio actual
server_directory = os.path.abspath(os.path.join(current_directory, ".."))
# Unir la ruta del directorio 'server' con los subdirectorios y el nombre del archivo
audio = os.path.join(server_directory, "server", "merge", "output_1711609454432.wav")
#print(audio)
#audio = "prueba.wav"

pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token=os.environ['HUGGIN_FACE_TOKEN'])
# send pipeline to GPU (when available)

pipeline.to(torch.device("cuda"))

# apply pretrained pipeline
diarization = pipeline(audio)
# number of speakers
speakers = set()
model = whisper.load_model("base")
model.to(torch.device("cuda"))

def transcripcion (audioFile):
    result = model.transcribe(audioFile, fp16=False)
    return result

# whisper_resultado = transcripcion(audio)
# segmentos = whisper_resultado['segments']
def transcribe_segments():
    whisper_resultado = transcripcion(audio) 
    segmentos = whisper_resultado['segments']
    return segmentos

segmentos = transcribe_segments()
# #print(type(transcribe_segments))
    
    
# #print(segmentos)
# #print(type(segmentos))


# # model = whisper.load_model("small")
# # model.to(torch.device("cuda"))
# # result = model.transcribe(audio)
# # segmentos_whisper = result['segments']

for turn, _, speaker in diarization.itertracks(yield_label=True):
    turn_transcription = ''
    for segment in segmentos:
        # Calcula el solapamiento entre el turno y el segmento
        overlap = min(segment['end'], turn.end) - max(segment['start'], turn.start)
        # Si hay solapamiento, añade el texto del segmento a la transcripción del turno
        if overlap > 0:
            turn_transcription += ' ' + segment['text']
    if speaker not in transcriptions_by_speaker:
        transcriptions_by_speaker[speaker] = []
    transcriptions_by_speaker[speaker].append(turn_transcription.strip())

# # Imprime las transcripciones de cada hablante
for speaker, transcriptions in transcriptions_by_speaker.items():
    #print(f"Speaker {speaker}: {' '.join(transcriptions)}")
    print(json.dumps(f"Speaker {speaker}: {' '.join(transcriptions)}"))


num_speakers = len(transcriptions_by_speaker)



# #print('Resultado importante >>>'+segmentos[0]['text'])
# # generate transcription for each speaker
# for turn, _, speaker in diarization.itertracks(yield_label=True):
#     turn_transcription = ''
#     for segment in segmentos:
#         if (abs(segment['start'] - turn.start) < epsilon):
#             turn_transcription = segment['text']
#     #transcription = f"start={turn.start:.1f}s stop={turn.end:.1f}s speaker_{speaker}\n"
#     if speaker not in transcriptions_by_speaker:
#         transcriptions_by_speaker[speaker] = []
#     #transcriptions_by_speaker[speaker].append(transcription)
#     transcriptions_by_speaker[speaker].append(turn_transcription)

# # # Imprime las transcripciones de cada hablante
# for speaker, transcriptions in transcriptions_by_speaker.items():
#     #print(f"Speaker {speaker}: {' '.join(transcriptions)}")
#     print(json.dumps(f"Speaker {speaker}: {' '.join(transcriptions)}"))


# num_speakers = len(transcriptions_by_speaker)
# #print(f"Cantidad de hablantes en la conversacion: {num_speakers}")


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