from itertools import product
import time


def generate_slice_coords(mosaic_width, mosaic_height, model_width, model_height, stride_length, annotations_df):
    # determine upper left corner of each slice
    # uses sliding window
    slice_x_coords = list(range(0, mosaic_width - model_width, stride_length))
    slice_x_coords.append(mosaic_width - model_width)
    slice_y_coords = list(range(0, mosaic_height - model_height, stride_length))
    slice_y_coords.append(mosaic_height - model_height)
    slice_coords_list = list(product(slice_x_coords, slice_y_coords))
    slice_coords_dict = {key: list() for key in slice_coords_list}

    total_annotations = 0
    tic = time.perf_counter()

    # iterate over all annotations
    for index, row in annotations_df.iterrows():
        # get corners of annotation
        x1 = row['x1']
        x2 = row['x2']
        y1 = row['y1']
        y2 = row['y2']
        assert x1 <= x2
        assert y1 <= y2

        # calculate width and height of annotation
        annotation_width = x2 - x1
        annotation_height = y2 - y1

        # Get all slices that have full annotation in them.
        # Start coordinate must be at least 0.
        # Start coordinate must be the start of a slice; cannot be between slices (if so, go to next slice).
        # Repeat for x and y.

        # Start is the left-most/top-most coordinate of the left-most/top-most slice that would contain this annotation.
        # End is the left-most/top-most coordinate of the right-most/bottom-most slice that would contain this annotation.

        x_start = max(0, x2 - model_width)
        x_start = (int(x_start / stride_length) + (x_start % stride_length != 0)) * stride_length
        x_start = min(x_start, mosaic_width - model_width)
        x_end = min(x2 - annotation_width, mosaic_width - model_width)

        y_start = max(0, y2 - model_height)
        y_start = (int(y_start / stride_length) + (y_start % stride_length != 0)) * stride_length
        y_start = min(y_start, mosaic_height - model_height)
        y_end = min(y2 - annotation_height, mosaic_height - model_height)

        # add this annotation to all slices that include it
        for coord in product(range(x_start, x_end+1, stride_length), range(y_start, y_end+1, stride_length)):
            slice_coords_dict[coord].append(tuple(row))
            total_annotations += 1

    toc = time.perf_counter()
    print(f"{toc - tic:0.4f} seconds")
    print(f"{total_annotations} total annotations over all slices")

    return slice_coords_dict
