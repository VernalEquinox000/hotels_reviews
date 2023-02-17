const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
const { writeFile } = require("fs").promises;
const csv = require("csv-stringify");
const { promisify } = require("util");
const promisifiedStringify = promisify(csv.stringify);

const options = {
  method: "GET",
  headers: {
    "X-RapidAPI-Key": process.env.RAPID_API_KEY,
    "X-RapidAPI-Host": process.env.RAPID_API_HOST,
  },
};

//function to find and save the city id associated to the city of choice.
const getCityId = async () => {
  const cityName = "Makkah";

  const url =
    process.env.RAPID_API_URL +
    "/v1/hotels/locations?locale=en-gb&name=" +
    cityName;

  try {
    const response = await axios.get(url, options);
    const citiesArray = response.data;
    const cityId = citiesArray[0].dest_id;
    return cityId;
  } catch (error) {
    console.log(error);
  }
};

//function to retrieve the hotels from the selected city, given the city id.
const getHotels = async (destId) => {
  const url =
    process.env.RAPID_API_URL +
    "/v1/hotels/search?dest_id=" +
    destId +
    "&order_by=popularity&filter_by_currency=AED&adults_number=2&room_number=1&checkout_date=2023-07-16&units=metric&checkin_date=2023-07-15&dest_type=city&locale=en-gb";

  try {
    const response = await axios.get(url, options);
    const data = response.data;
    const cityHotels = data.result
      .slice(0, 20)
      .map(
        selectProps(
          "hotel_id",
          "hotel_name",
          "url",
          "class",
          "latitude",
          "longitude"
        )
      );
    return cityHotels;
  } catch (error) {
    console.log(error);
  }
};

//function to retrieve the reviews for every hotel, using every hotel id of the hotels in the array.
const getReviewsForEveryHotel = async (hotelsArray) => {
  let hotelsAndReviews = [];
  for (let hotel of hotelsArray) {
    const apiUrl =
      process.env.RAPID_API_URL +
      "/v1/hotels/reviews?hotel_id=" +
      hotel.hotel_id +
      "&locale=en-gb&sort_type=SORT_MOST_RELEVANT";

    try {
      const response = await axios.get(apiUrl, options);
      const data = response.data;
      const reviews = data.result.slice(0, 3);
      if (reviews.length === 0) {
        hotel = {
          //this object is needed in order to assign the reviews object properties even to empty reviews array
          //which would otherwise be bypassed by the writeCSV function
          ...hotel,
          title: "",
          pros: "",
          cons: "",
          average_score: "",
          date: "",
        };
        hotelsAndReviews.push(hotel);
      }
      for (let i = 0; i < reviews.length; i++) {
        hotel = {
          ...hotel,
          title: reviews[i].title,
          pros: reviews[i].pros,
          cons: reviews[i].cons,
          average_score: reviews[i].average_score,
          date: reviews[i].date,
        };
        hotelsAndReviews.push(hotel);
      }
    } catch (error) {
      console.log(error);
    }
  }
  return hotelsAndReviews;
};

//utility function to select the properties needed in the data retrieved from the APIs
const selectProps = (...props) => {
  return function (obj) {
    const newObj = {};
    props.forEach((name) => {
      newObj[name] = obj[name];
    });

    return newObj;
  };
};

//function which generates a CSV file with the hotels and the associated reviews.
const writeCSV = async (data) => {
  const output = await promisifiedStringify(data, { header: true });
  await writeFile(__dirname + "/hotels.csv", output);
  console.log("csv file ready!");
};

async function hotelsAndReviewsScript() {
  const destinationCityId = await getCityId();
  const destinationCityHotels = await getHotels(destinationCityId);
  const destinationCityHotelsAndReviews = await getReviewsForEveryHotel(
    destinationCityHotels
  );
  await writeCSV(destinationCityHotelsAndReviews);
}

hotelsAndReviewsScript();
