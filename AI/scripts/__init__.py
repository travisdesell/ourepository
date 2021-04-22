import logging
import os
import absl.logging

logging.basicConfig(
    format='%(asctime)s %(filename)s %(levelname)-8s %(message)s',
    level=logging.INFO,
    datefmt='%Y-%m-%d %H:%M:%S')

logging.getLogger().setLevel(logging.INFO)

# give absl logger same format
formatter = logging.Formatter(
    fmt='%(asctime)s %(filename)s %(levelname)-8s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S')
absl.logging.get_absl_handler().setFormatter(formatter)

# give TensorFlow logging same format
logging.getLogger('tensorflow').setLevel(logging.ERROR)
for h in logging.getLogger('tensorflow').handlers:
    h.setFormatter(formatter)

# the root directory where all output should go
ROOT_DIR = os.path.join(os.path.dirname(__file__), '..')
