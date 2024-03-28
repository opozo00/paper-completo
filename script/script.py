# import whisper

# model = whisper.load_model("base")
# model = whisper.load_model("small")
# model.to(torch.device("cuda"))
# result = model.transcribe("audio.mp3")
# print(result["text"])
import datetime
import sys
from pyannote.audio import Pipeline
import json
from dotenv import load_dotenv
import os
import torch
import whisper

load_dotenv()
audio_file_path = sys.argv[1]   # primer argumento enviado desde el servidor
#segmentos = json.loads(sys.argv[2]) #segundo argumento enviador desde el servidor
transcriptions_by_speaker = {}  # dictionary to store transcription for each speaker
epsilon = 0.8  # Ajusta esto según sea necesario
# Ruta del archivo de audio
#C:/Users/Chelo/Desktop/UEES/practica-paper-final/server/merge
audio = f"C:/Users/Chelo/Desktop/UEES/practica-paper-final/server/merge/{audio_file_path}"

pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token=os.environ['HUGGIN_FACE_TOKEN'])
# send pipeline to GPU (when available)

pipeline.to(torch.device("cuda"))

# apply pretrained pipeline
diarization = pipeline(audio)
# number of speakers
speakers = set()

model = whisper.load_model("small")
model.to(torch.device("cuda"))
result = model.transcribe(audio)
segmentos_whisper = result['segments']

for turn, _, speaker in diarization.itertracks(yield_label=True):
    turn_transcription = ''
    for segment in segmentos_whisper:
        if (abs(segment['start'] - turn.start) < epsilon):
            turn_transcription = segment['text']
    #transcription = f"start={turn.start:.1f}s stop={turn.end:.1f}s speaker_{speaker}\n"
    if speaker not in transcriptions_by_speaker:
        transcriptions_by_speaker[speaker] = []
    #transcriptions_by_speaker[speaker].append(transcription)
    transcriptions_by_speaker[speaker].append(turn_transcription)

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


