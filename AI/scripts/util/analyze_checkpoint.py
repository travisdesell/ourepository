import os
from tensorflow.python.summary.summary_iterator import summary_iterator
from tensorflow.python.framework import tensor_util
import pandas as pd

from scripts import ROOT_DIR


def find_tfevents(model_dir, type):
    path = os.path.join(model_dir, type)
    return [os.path.join(path, f) for f in os.listdir(path) if
            os.path.isfile(os.path.join(path, f))]  # return files from train/ directory


def tfevent_final_losses(model_dir, type='train'):
    tfevents = find_tfevents(model_dir, type)
    max_step = -1
    losses = []
    for tfevent in tfevents:
        for e in summary_iterator(tfevent):
            for v in e.summary.value:
                if '/total_loss' in v.tag and e.step >= max_step:
                    val = tensor_util.MakeNdarray(v.tensor).item(0)
                    max_step = e.step
                    losses.append(val)
                    print(f"Found new loss at step {e.step}: {val}")
    last_two = list(smooth(losses)['data'])[-2:]
    return last_two


def checkpoint_steps(model_dir):
    tfevents = find_tfevents(model_dir, 'train')
    max_step = -1
    for tfevent in tfevents:
        for e in summary_iterator(tfevent):
            for v in e.summary.value:
                if '/total_loss' in v.tag:
                    max_step = e.step
    return max_step


def smooth(data):
    return pd.DataFrame({'data': data}).ewm(alpha=0.1).mean()


def get_last_checkpoint(model_dir):
    # TODO not done, but do I even need to do this?
    return [os.path.join(model_dir, f) for f in os.listdir(model_dir) if
            os.path.isfile(os.path.join(model_dir, f))]  # return files from train/ directory


if __name__ == '__main__':
    user_models_dir = os.path.join(ROOT_DIR, 'models')
    model_dir = os.path.join(user_models_dir, 'test')
    print(tfevent_final_loss(model_dir, type='eval'))
    # print(checkpoint_steps(model_dir))
