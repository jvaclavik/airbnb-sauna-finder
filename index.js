const fetch = require("node-fetch");

const express = require("express");
const path = require("path");

const port = process.env.PORT || 8085;
const app = express();

const numberOfItemsOnOnePage = 10;
const maximumOfRequests = 20;
const currency = "CZK";
let saunaLinks = "";
let numberOfRequests = 0;

app.use(express.static(__dirname, { dotfiles: "allow" }));
app.engine("html", require("ejs").renderFile);
app.get("/", async function(req, res) {
  saunaLinks = "";
  numberOfRequests = 0;
  if (req.query) {
    console.log(req.query.query);
    await fetchResultPage(req.query.query);
    res.render(__dirname + "/public/index.html", { links: saunaLinks });
  }
});
app.listen(port);

const editableParams = {
  // query: "Helsinki, Finland",
  // checkin: "2020-04-01",
  // checkout: "2020-04-17",
  price_min: 0,
  price_max: 10000,
  adults: 6
  // infants: 0,
  // superhost: "true",
};

const headers = {
  accept: "application/json",
  "accept-encoding": "br, gzip, deflate",
  "content-type": "application/json",
  "x-airbnb-api-key": "915pw2pnf4h1aiguhph5gc5b2",
  "x-airbnb-currency": currency,
  "x-airbnb-locale": "en",
  "x-airbnb-carrier-country": "us",
  "accept-language": "en-us"
};

const getParams = (itemsOffset = 0) => ({
  ...editableParams,
  _limit: numberOfItemsOnOnePage,
  toddlers: "0",
  is_guided_search: "true",
  version: "1.4.8",
  section_offset: "0",
  items_offset: itemsOffset,
  screen_size: "small",
  source: "explore_tabs",
  items_per_grid: "500",
  _format: "for_explore_search_native",
  metadata_only: "false",
  "refinement_paths[]": "/homes",
  timezone: "Europe/Prague",
  satori_version: "1.1.0"
});

const filterAsync = (array, filter) =>
  Promise.all(array.map(entry => filter(entry))).then(bits =>
    array.filter(entry => bits.shift())
  );

const fetchHome = id => {
  if (numberOfRequests > maximumOfRequests) return;
  const request = fetch(
    `https://api.airbnb.com/v2/pdp_listing_details/${id}?_format=for_native`,
    {
      method: "get",
      headers: headers
    }
  )
    .then(body =>
      body.json().catch(e => {
        // console.log(`Not a JSON response (ID: ${id})`);
      })
    )
    .then(body => {
      if (body) {
        const descriptionObject = body.pdp_listing_detail.sectioned_description;
        const photo = body.pdp_listing_detail.photos[0].large;
        const searchedInFields = [
          "space",
          "summary",
          "notes",
          "name",
          "access"
        ];

        const isSaunaAvailable =
          searchedInFields
            .map(field => descriptionObject[field])
            .join(" ")
            .indexOf("saun") !== -1;

        if (isSaunaAvailable) {
          const params = getParams();
          const homeUrl = `https://www.airbnb.cz/rooms/${id}`;
          const homeUrlWithDateInterval =
            params.checkin && params.checkout
              ? `${homeUrl}?check_in=${params.checkin}&check_out=${params.checkout}`
              : homeUrl;
          saunaLinks = `${saunaLinks}<a href="${homeUrlWithDateInterval}" target="_blank"><div class="item" style="background-image: url('${photo}')"></div></a>`;
          console.log(`- ${homeUrlWithDateInterval}`);
        }
      }
    })
    .catch(e => {
      console.log(e);
    });
  numberOfRequests++;
  return request;
};

const fetchResultPage = async (query = null, offset = 0) => {
  if (numberOfRequests > maximumOfRequests || query === null) return;
  const params = getParams(offset);
  console.log(`Query: ${query}`);
  const paramString =
    Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join("&") + `&query=${query}`;

  console.log(`https://api.airbnb.com/v2/explore_tabs?${paramString}`);
  const request = await fetch(
    `https://api.airbnb.com/v2/explore_tabs?${paramString}`,
    {
      method: "get",
      headers: headers
    }
  );
  try {
    const body = await request.json();
    if (body) {
      const ids = body.explore_tabs[0].home_tab_metadata.remarketing_ids;
      const homePromise = await filterAsync(ids, fetchHome);
      if (body.explore_tabs[0].pagination_metadata.has_next_page) {
        await fetchResultPage(query, offset + numberOfItemsOnOnePage);
      }
    }
  } catch (err) {
    console.log("error");
  }

  numberOfRequests++;
};
console.log(`Saunas\n============================`);
fetchResultPage();
