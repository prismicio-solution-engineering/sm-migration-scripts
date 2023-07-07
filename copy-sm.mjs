import fs from "fs";
import dotenv from "dotenv";
import fetch from "node-fetch";
import _ from "lodash";

dotenv.config();

const auth = process.env.TOKEN;
const HEADERS = {
  repository: process.env.REPO,
  Authorization: `Bearer ${auth}`,
};

var logs = {
  merged_slices: [],
  created_slices: [],
  slice_zones: [],
};

(() => {
  // console.log(HEADERS);

  // fetch slice machine slices
  fetch("https://customtypes.prismic.io/slices", {
    headers: HEADERS,
  })
    .then((res) => res.json())
    .then((sms) => {
      // Create folder for each Shared Slice
      fs.mkdirSync("./migrated/customtypes", { recursive: true }); // Will contain your migrated custom types. This folder and its content will be copied and pasted into your new slice machine project
      fs.mkdirSync("./migrated/slices"); // Will contain your migrated slices. This folder and its content will be copied and pasted into your new slice machine project
      fs.mkdirSync("./exports/legacy_docs", { recursive: true }); // Will contain the exported legacy files
      fs.mkdirSync("./exports/sm_docs"); // Will contain the exported slice machine content files for link maping

      sms.forEach((slice) => {
        fs.mkdirSync(`./migrated/slices/${slice.id}`);
        // console.log(slice)
        fs.writeFileSync(
          `./migrated/slices/${slice.id}/model.json`,
          JSON.stringify(slice, null, 2)
        );
      });
    });

  })();
