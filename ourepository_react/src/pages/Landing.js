import React from 'react';

const LandingPage = (props) => {

      return (
        <div class="bg-gray-600 shadow-md rounded px-8 pt-6 pb-8 mb-4 flex ">

        <div class="bg-gray-700 w-1/2 shadow-md rounded px-8 pt-6 pb-8 flex-col"> Your Organizations
        <div class=" p-2"></div>

        <div class="bg-gray-800  shadow-md rounded px-4 pt-3 pb-4"> Eye In The Sky</div>

        </div>
        <div class=" p-1"></div>
        <div class="flex-col ">
        <div class="bg-gray-800  shadow-md rounded px-8 pt-6 pb-8"> Create Organization</div>
        <div class=" p-1"></div>
        <div class="bg-gray-900  shadow-md rounded px-8 pt-6 pb-8"> Join Organization</div>
        </div>

    </div>
    );
};

export default LandingPage;