import unittest
import pandas as pd

from scripts.util.slice_utils import generate_slice_coords_with_annotations


class TestSlice(unittest.TestCase):

    def setUp(self):
        # these values were chosen specifically so that the right-most/bottom-most slices start less than a stride
        # length away from the previous slice
        self.mosaic_width = 98
        self.mosaic_height = 98
        self.model_width = 16
        self.model_height = 16
        self.stride_length = 8

    def get_slice_coords_dict(self, data):
        """
        Get generated slice coordinates with provided data

        :param data: list of x1, x2, y1, y2 coordinates for annotations
        :return: generated slice coordinates dictionary with annotations
        """

        annotations_df = pd.DataFrame(data, columns=['x1', 'x2', 'y1', 'y2'])

        return generate_slice_coords_with_annotations(self.mosaic_width, self.mosaic_height, self.model_width, self.model_height,
                                                      self.stride_length, annotations_df)

    def get_slice_coords_dict_empty_removed(self, data):
        """
        Get generated slice coordinates with provided data, but remove coordinates that do not have annotations in
        the slice

        :param data: list of x1, x2, y1, y2 coordinates for annotations
        :return: generated slice coordinates dictionary with annotations with emply slices removed
        """

        slice_coords_dict = self.get_slice_coords_dict(data)
        return {coord: annotations for (coord, annotations) in slice_coords_dict.items() if len(annotations) > 0}

    def test_contains_end_slice(self):
        """
        The right and bottom edges of the mosaic are accounted for in slices

        :return: none
        """

        data = list()
        slice_coords_dict = self.get_slice_coords_dict_empty_removed(data)

        self.assertIn((self.mosaic_width - self.model_width, self.mosaic_height - self.model_height), slice_coords_dict)

    def test_start_annotation(self):
        """
        Only one slice should contain an annotation when the annotation is at the top left

        :return: none
        """

        data = [[0, 2, 0, 2]]
        slice_coords_dict = self.get_slice_coords_dict_empty_removed(data)

        self.assertEqual(len(slice_coords_dict), 1)

    def test_middle_annotation(self):
        """
        Four slices should contain an annotation when the annotation is in the middle

        :return: none
        """

        data = [[50, 52, 50, 52]]
        slice_coords_dict = self.get_slice_coords_dict_empty_removed(data)

        self.assertEqual(len(slice_coords_dict), 4)

    def test_end_annotation(self):
        """
        There should be at least one slice containing an annotation when the annotation is in the bottom right

        :return: none
        """

        data = [[96, 97, 96, 97]]
        slice_coords_dict = self.get_slice_coords_dict_empty_removed(data)

        self.assertGreater(len(slice_coords_dict), 0)


if __name__ == '__main__':
    unittest.main()
