import os
from tensorflow.python.summary.summary_iterator import summary_iterator
from tensorflow.python.framework import tensor_util
import pandas as pd


def find_tfevents(model_dir, type):
    """
    Searches the given directory for files. It is assumed that this directory contains tfevent files.
    :param model_dir: the directory containing the model files
    :param type: one of either 'train' or 'eval' indicating if we are looking for training or evaluation tfevent files
    :return: A list of strings where each string is a path to a tfevent file
    """
    path = os.path.join(model_dir, type)
    return [os.path.join(path, f) for f in os.listdir(path) if
            os.path.isfile(os.path.join(path, f))]  # return files from the specified directory


def tfevent_final_losses(model_dir, type='train', n=2):
    """
    Gets the n most recent loss values. The default for n is 2, meaning the 2 most recent losses are returned so they
    can be compared to see if the loss went up. The smoothing is done with an exponential moving average.
    :param model_dir: the directory containing the model files
    :param type: one of either 'train' or 'eval'. Defaults to train
    :param n: How many losses to return. Defaults to 2
    :return: A list of n smoothed loss values
    """
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
    last_two = list(smooth(losses)['data'])[-n:]
    return last_two


def checkpoint_steps(model_dir):
    """
    Finds the maximum step that the model has been trained to. This is done by looking at the training tfevent files.
    :param model_dir: the directory containing the model files
    :return: The max step
    """
    tfevents = find_tfevents(model_dir, 'train')
    max_step = -1
    for tfevent in tfevents:
        for e in summary_iterator(tfevent):
            for v in e.summary.value:
                if '/total_loss' in v.tag:
                    max_step = e.step
    return max_step


def smooth(data):
    """
    Smooths the given data using an exponential moving average.
    """
    return pd.DataFrame({'data': data}).ewm(alpha=0.3).mean()
