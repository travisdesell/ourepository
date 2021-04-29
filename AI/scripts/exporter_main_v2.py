# Lint as: python2, python3
# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================

"""
Tool to export an object detection model for inference.

Prepares an object detection tensorflow graph for inference using model
configuration and a trained checkpoint. Outputs associated checkpoint files,
a SavedModel, and a copy of the model config.


TODO Flags must be adjusted a bit for which are required

       USAGE: exporter_main_v2.py [flags]
flags:

exporter_main_v2.py:
  --config_override: pipeline_pb2.TrainEvalPipelineConfig text proto to override
    pipeline_config_path.
    (default: '')
  --input_type: Type of input node. Can be one of [`image_tensor`,
    `encoded_image_string_tensor`, `tf_example`, `float_image_tensor`]
    (default: 'image_tensor')
  --model_uuid: the UUID of the model to run
    (default: 'test')
  --output_directory: Path to write outputs.
  --pipeline_config_path: Path to a pipeline_pb2.TrainEvalPipelineConfig config
    file.
  --side_input_names: If use_side_inputs is True, this explicitly sets the names
    of the side input tensors required by the model assuming the names will be a
    comma-separated list of strings. This flag is required if using side inputs.
    (default: '')
  --side_input_shapes: If use_side_inputs is True, this explicitly sets the
    shape of the side input tensors to a fixed size. The dimensions are to be
    provided as a comma-separated list of integers. A value of -1 can be used
    for unknown dimensions. A `/` denotes a break, starting the shape of the
    next side input tensor. This flag is required if using side inputs.
    (default: '')
  --side_input_types: If use_side_inputs is True, this explicitly sets the type
    of the side input tensors. The dimensions are to be provided as a comma-
    separated list of types, each of `string`, `integer`, or `float`. This flag
    is required if using side inputs.
    (default: '')
  --trained_checkpoint_dir: Path to trained checkpoint directory
  --[no]use_side_inputs: If True, uses side inputs as well as image inputs.
    (default: 'false')

TODO: The following flag may be kept or removed depending on how we want to handle user setting of config
    --config_override " \
            model{ \
              faster_rcnn { \
                second_stage_post_processing { \
                  batch_non_max_suppression { \
                    score_threshold: 0.5 \
                  } \
                } \
              } \
            }"
"""

import logging
import os

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # suppress TensorFlow logging

from absl import app
from absl import flags

import tensorflow as tf
from google.protobuf import text_format
from object_detection import exporter_lib_v2

from scripts.util.edit_pipeline_config import load_config
from scripts.util.file_utils import create_directory_if_not_exists

from scripts import ROOT_DIR

logger = logging.getLogger(__name__)

FLAGS = flags.FLAGS

flags.DEFINE_string('input_type', 'image_tensor', 'Type of input node. Can be '
                                                  'one of [`image_tensor`, `encoded_image_string_tensor`, '
                                                  '`tf_example`, `float_image_tensor`]')
flags.DEFINE_string('pipeline_config_path', None,
                    'Path to a pipeline_pb2.TrainEvalPipelineConfig config '
                    'file.')
flags.DEFINE_string('trained_checkpoint_dir', None,
                    'Path to trained checkpoint directory')
flags.DEFINE_string('output_directory', None, 'Path to write outputs.')
flags.DEFINE_string('config_override', '',
                    'pipeline_pb2.TrainEvalPipelineConfig '
                    'text proto to override pipeline_config_path.')
flags.DEFINE_boolean('use_side_inputs', False,
                     'If True, uses side inputs as well as image inputs.')
flags.DEFINE_string('side_input_shapes', '',
                    'If use_side_inputs is True, this explicitly sets '
                    'the shape of the side input tensors to a fixed size. The '
                    'dimensions are to be provided as a comma-separated list '
                    'of integers. A value of -1 can be used for unknown '
                    'dimensions. A `/` denotes a break, starting the shape of '
                    'the next side input tensor. This flag is required if '
                    'using side inputs.')
flags.DEFINE_string('side_input_types', '',
                    'If use_side_inputs is True, this explicitly sets '
                    'the type of the side input tensors. The '
                    'dimensions are to be provided as a comma-separated list '
                    'of types, each of `string`, `integer`, or `float`. '
                    'This flag is required if using side inputs.')
flags.DEFINE_string('side_input_names', '',
                    'If use_side_inputs is True, this explicitly sets '
                    'the names of the side input tensors required by the model '
                    'assuming the names will be a comma-separated list of '
                    'strings. This flag is required if using side inputs.')

# NEW FLAGS

flags.DEFINE_string(
    'model_uuid',
    help='the UUID of the model to run',
    default='test'
)


def main(_):
    # TODO what flags should be required?
    # flags.mark_flag_as_required('pipeline_config_path')
    # flags.mark_flag_as_required('trained_checkpoint_dir')
    # flags.mark_flag_as_required('output_directory')

    # path to directory containing the specific user-trained model
    trained_model_dir = os.path.join(ROOT_DIR, 'models', FLAGS.model_uuid)

    # user exported models
    user_models_dir = os.path.join(ROOT_DIR, 'exported-models')
    create_directory_if_not_exists(user_models_dir)

    # path to directory containing the specific user-trained exported model
    model_dir = os.path.join(user_models_dir, FLAGS.model_uuid)
    create_directory_if_not_exists(model_dir)

    # path to pipeline config for this mosaic for this model
    pipeline_config_path = trained_model_dir + '/pipeline.config'

    # load the pipeline configuration
    pipeline_config = load_config(pipeline_config_path)
    text_format.Merge(FLAGS.config_override, pipeline_config)

    # export the model
    logger.info(f'Model export has started...')
    exporter_lib_v2.export_inference_graph(
        FLAGS.input_type, pipeline_config, trained_model_dir,
        model_dir, FLAGS.use_side_inputs, FLAGS.side_input_shapes,
        FLAGS.side_input_types, FLAGS.side_input_names)

    logger.info(f'Model export completed')


if __name__ == '__main__':
    app.run(main)
