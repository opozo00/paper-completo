from pyannote.audio import Pipeline
from pyannote.metrics.diarization import DiarizationErrorRate
from pyannote.core import Annotation, Segment
import torch
import whisper
import time
from dotenv import load_dotenv
import os

load_dotenv()
# directorio actual
current_directory = os.path.dirname(os.path.abspath(__file__))
# directorio hacia arriba desde el directorio actual
server_directory = os.path.abspath(os.path.join(current_directory, ".."))
# Unir la ruta del directorio 'server' con los subdirectorios y el nombre del archivo
audio = os.path.join(server_directory, "server", "merge", "output_1712601082673.wav")
#audio = 'output_1712601082673.wav'

pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token=os.environ['HUGGIN_FACE_TOKEN'])

# send pipeline to GPU (when available)
pipeline.to(torch.device("cuda"))
diarization = pipeline(audio)