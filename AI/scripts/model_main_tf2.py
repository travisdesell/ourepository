# Lint as: python3
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
TODO Flags must be adjusted a bit for which are required

       USAGE: model_main_tf2.py [flags]
flags:

model_main_tf2.py:
  --checkpoint_dir: Path to directory holding a checkpoint.  If `checkpoint_dir`
    is provided, this binary operates in eval-only mode, writing resulting
    metrics to `model_dir`.
  --checkpoint_every_n: Integer defining how often we checkpoint.
    (default: '50')
    (an integer)
  --[no]continue_from_checkpoint: whether training should continue from a
    checkpoint
    (default: 'false')
  --data_dir: directory containing directories containing mosaic and CSVs to
    train on
    (default: 'C:/Users/Ian/Documents/College/Fourth Year/Fall Semester/Software
    Engineering Project/ourepository/AI/scripts\\../test/test')
  --[no]eval_on_train_data: Enable evaluating on train data (only supported in
    distributed training).
    (default: 'false')
  --eval_timeout: Number of seconds to wait for anevaluation checkpoint before
    exiting.
    (default: '3600')
    (an integer)
  --model_dir: Path to output model directory where event and checkpoint files
    will be written.
  --model_name: the name of the pretrained model from the TF Object Detection
    model zoo
    (default: 'faster_rcnn_resnet50_v1_640x640_coco17_tpu-8')
  --model_uuid: the UUID of the model to run
    (default: 'test')
  --num_train_steps: Number of train steps.
    (an integer)
  --num_workers: When num_workers > 1, training uses
    MultiWorkerMirroredStrategy. When num_workers = 1 it uses MirroredStrategy.
    (default: '1')
    (an integer)
  --pipeline_config_path: Path to pipeline config file.
  --[no]record_summaries: Whether or not to record summaries during training.
    (default: 'true')
  --sample_1_of_n_eval_examples: Will sample one of every n eval input examples,
    where n is provided.
    (an integer)
  --sample_1_of_n_eval_on_train_examples: Will sample one of every n train input
    examples for evaluation, where n is provided. This is only used if
    `eval_training_data` is True.
    (default: '5')
    (an integer)
  --tpu_name: Name of the Cloud TPU for Cluster Resolvers.
  --[no]use_tpu: Whether the job is executing on a TPU.
    (default: 'false')
"""

import logging
import os
import shutil
import sys


os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # suppress TensorFlow logging

from absl import flags
import tensorflow as tf
from object_detection import model_lib_v2
from object_detection.utils import label_map_util

from scripts.util.download_model import download_and_unpack_model
from scripts.util.edit_pipeline_config import edit_pipeline_config
from scripts.util.file_utils import create_directory_if_not_exists, full_path
from scripts.util.analyze_checkpoint import tfevent_final_losses, checkpoint_steps

from scripts import ROOT_DIR

logger = logging.getLogger(__name__)

flags.DEFINE_string('pipeline_config_path', None, 'Path to pipeline config '
                                                  'file.')
flags.DEFINE_integer('num_train_steps', None, 'Number of train steps.')
flags.DEFINE_bool('eval_on_train_data', False, 'Enable evaluating on train '
                                               'data (only supported in distributed training).')
flags.DEFINE_integer('sample_1_of_n_eval_examples', None, 'Will sample one of '
                                                          'every n eval input examples, where n is provided.')
flags.DEFINE_integer('sample_1_of_n_eval_on_train_examples', 5, 'Will sample '
                                                                'one of every n train input examples for evaluation, '
                                                                'where n is provided. This is only used if '
                                                                '`eval_training_data` is True.')
flags.DEFINE_string(
    'model_dir', None, 'Path to output model directory '
                       'where event and checkpoint files will be written.')
flags.DEFINE_string(
    'checkpoint_dir', None, 'Path to directory holding a checkpoint.  If '
                            '`checkpoint_dir` is provided, this binary operates in eval-only mode, '
                            'writing resulting metrics to `model_dir`.')

flags.DEFINE_integer('eval_timeout', 3600, 'Number of seconds to wait for an'
                                           'evaluation checkpoint before exiting.')

flags.DEFINE_bool('use_tpu', False, 'Whether the job is executing on a TPU.')
flags.DEFINE_string(
    'tpu_name',
    default=None,
    help='Name of the Cloud TPU for Cluster Resolvers.')
flags.DEFINE_integer(
    'num_workers', 1, 'When num_workers > 1, training uses '
                      'MultiWorkerMirroredStrategy. When num_workers = 1 it uses '
                      'MirroredStrategy.')
flags.DEFINE_integer(
    'checkpoint_every_n', 50, 'Integer defining how often we checkpoint.')
flags.DEFINE_boolean('record_summaries', True,
                     ('Whether or not to record summaries during'
                      ' training.'))

# NEW FLAGS

flags.DEFINE_string(
    'model_uuid',
    help='the UUID of the model to run',
    default='test'
)
flags.DEFINE_string(
    'data_dir',
    help='directory containing directories containing mosaic and CSVs to train on',
    default=os.path.join(os.path.dirname(__file__), '../test/test')
)
flags.DEFINE_string(
    'model_name',
    help='the name of the pretrained model from the TF Object Detection model zoo',
    default='faster_rcnn_resnet50_v1_640x640_coco17_tpu-8'
)  # TODO maybe add option for year
flags.DEFINE_boolean(
    'continue_from_checkpoint',
    help='whether training should continue from a checkpoint',
    default=False
)

FLAGS = flags.FLAGS


def train_model(pipeline_config_path, model_dir, steps_per_run):
    """
    Runs one training loop. Because this function is blocking, we will only train for a small number of steps at a time
    so that we can periodically stop to evaluate the training progress. Will create one checkpoint during this run.

    :param pipeline_config_path: the path to the pipeline config
    :param model_dir: the directory containing the model files
    :param steps_per_run: how many steps will be taken this run. Used to configure how often to create a checkpoint
    """

    if FLAGS.use_tpu:
        # TPU is automatically inferred if tpu_name is None and
        # we are running under cloud ai-platform.
        resolver = tf.distribute.cluster_resolver.TPUClusterResolver(
            FLAGS.tpu_name)
        tf.config.experimental_connect_to_cluster(resolver)
        tf.tpu.experimental.initialize_tpu_system(resolver)
        strategy = tf.distribute.experimental.TPUStrategy(resolver)
    elif FLAGS.num_workers > 1:
        strategy = tf.distribute.experimental.MultiWorkerMirroredStrategy()
    else:
        strategy = tf.compat.v2.distribute.MirroredStrategy()

    logger.info(f'Model training has started...')
    with strategy.scope():
        model_lib_v2.train_loop(
            pipeline_config_path=pipeline_config_path,
            model_dir=model_dir,
            train_steps=FLAGS.num_train_steps,
            use_tpu=FLAGS.use_tpu,
            checkpoint_every_n=steps_per_run-1,
            record_summaries=FLAGS.record_summaries,
            num_steps_per_iteration=1,  # TODO if using TPU this maybe should be changed
            checkpoint_max_to_keep=5)
    logger.info(f'Model training completed')


def eval_model(pipeline_config_path, model_dir):
    """
    Evaluates the model on the test dataset. Will run the evaluation on the most recent checkpoint.

    :param pipeline_config_path: the path to the pipeline config
    :param model_dir: the directory containing the model files
    """

    logger.info(f'Model evaluation has started...')
    model_lib_v2.eval_continuously(
        pipeline_config_path=pipeline_config_path,
        model_dir=model_dir,
        train_steps=FLAGS.num_train_steps,
        sample_1_of_n_eval_examples=FLAGS.sample_1_of_n_eval_examples,
        sample_1_of_n_eval_on_train_examples=(
            FLAGS.sample_1_of_n_eval_on_train_examples),
        checkpoint_dir=model_dir,
        wait_interval=1, timeout=1)


def train_and_eval(last_results, pipeline_config_path, model_dir, steps_per_run):
    """
    Run one train and eval loop. Will first train the model for steps_per_run steps, then will stop and evaluate the
    model on the test set. The loss for each evaluation run will be smoothed, and if the loss went up for this round,
    we set went_up to True in the results dict. If went_up is True and it was also True in the last_results dict, then
    should_stop is set to True in the results dict. This indicates that we have begun to over-fit.

    :param last_results: dict containing information about the last time train_and_eval was called.
    :param pipeline_config_path: the path to the pipeline config
    :param model_dir: the directory containing the model files
    :param steps_per_run: how many steps will be taken this run
    :return: a dict containing information about the training progress including if the eval loss went up and if we
    should stop or not.
    """

    # train for n steps
    train_model(pipeline_config_path, model_dir, steps_per_run)

    # take note of final training loss
    train_loss = tfevent_final_losses(model_dir)[1]

    # eval on saved model
    eval_model(pipeline_config_path, model_dir)

    # find loss from evaluation
    eval_losses = tfevent_final_losses(model_dir, type='eval')

    # take note when the test loss goes up while the train loss goes down. This could indicate over-fitting
    if len(eval_losses) == 2:
        went_up = eval_losses[1] > eval_losses[0]
    else:
        went_up = False

    # if the test loss went up this time and last time, we can be certain that we are over-fitting so we should stop
    should_stop = went_up and last_results['went_up']

    results = {'went_up': went_up, 'should_stop': should_stop}
    logger.info(f"Finished training epoch. Train loss: {train_loss}, Eval losses: {eval_losses}, went up: {went_up}")
    return results


def main(unused_argv):
    # pretrained model from TensorFlow Object Detection model zoo
    pretrained_model_dir = os.path.join(ROOT_DIR, 'pre-trained-models', FLAGS.model_name)
    if not os.path.exists(pretrained_model_dir):
        download_and_unpack_model(FLAGS.model_name)

    # user models
    user_models_dir = os.path.join(ROOT_DIR, 'models')
    create_directory_if_not_exists(user_models_dir)

    # path to directory containing the specific user-trained model
    model_dir = os.path.join(user_models_dir, FLAGS.model_uuid)

    num_steps = 0

    # check whether model directory exists and whether to continue from checkpoint
    if os.path.exists(model_dir):
        if FLAGS.continue_from_checkpoint:
            logger.info(f'Continuing from checkpoint at {full_path(model_dir)}')
            num_steps = checkpoint_steps(model_dir)
            # TODO save and load results dict from previous run
        else:
            # if not continuing from checkpoint, raise error
            logger.error(f'Checkpoint file exists at {full_path(model_dir)} but continue_from_checkpoint is false')
            sys.exit(1)
    else:
        if FLAGS.continue_from_checkpoint:
            logger.error(f'Cannot find checkpoint at {full_path(model_dir)}')
            sys.exit(1)

    # create the user-trained model directory
    create_directory_if_not_exists(model_dir)

    # path to directory containing the annotations for this user-trained model
    model_annotations_dir = os.path.join(ROOT_DIR, 'annotations/' + FLAGS.model_uuid)

    # get the number of classes to train on
    label_map_path = os.path.join(model_annotations_dir, 'label_map.pbtxt')
    num_classes = len(label_map_util.load_labelmap(label_map_path).item)

    # begin the main training loop. Will continuously run until it is detected that the model is beginning to over-fit
    results = {'went_up': False, 'should_stop': False}
    steps_per_run = 25
    while not results['should_stop']:
        num_steps += steps_per_run

        # make the pipeline configuration
        pipeline_config_path = edit_pipeline_config(pretrained_model_dir, model_dir, num_classes, model_annotations_dir,
                                                    num_steps)

        # TODO what flags should be required
        # flags.mark_flag_as_required('model_dir')
        # flags.mark_flag_as_required('pipeline_config_path')
        tf.config.set_soft_device_placement(True)

        results = train_and_eval(results, pipeline_config_path, model_dir, steps_per_run)


if __name__ == '__main__':
    tf.compat.v1.app.run()
