import fs from "fs";
import dotenv from "dotenv";
import fetch from "node-fetch";
import _ from "lodash";
import migrate from "slice-machine-ui/build/lib/migrate.js";

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

const handleSlicezone = (sz, ct) => ({
  ...sz,
  config: {
    ...sz.config,
    choices: Object.fromEntries(
      Object.entries(sz.config.choices).map(([key, val]) => {
        // If slice folder doesn't exist create it
        if (!fs.existsSync(`./migrated/slices/${key}`)) {
          fs.mkdirSync(`./migrated/slices/${key}`);
          let data = JSON.stringify(
            {
              ...migrate.default(
                val,
                { sliceName: key, from: "slices" },
                { cwd: "./" },
                false
              ).model,
              migrated: undefined,
            },
            null,
            2
          );

          fs.writeFileSync(`./migrated/slices/${key}/model.json`, data);

          // Create slice index.js, need to write the template file as well or is it in slicemachine ui ?
          // fs.writeFileSync(
          //   `./migrated/slices/${key}/index.js`, ''
          // );

          return [key, { type: "SharedSlice" }];
        } else {
          // Compare the slice model.json, if it has the same structure -> ignore
          let original = JSON.parse(
            fs.readFileSync(`./migrated/slices/${key}/model.json`)
          );

          let duplicate = {
            ...migrate.default(
              val,
              { sliceName: key, from: "slices" },
              { cwd: "./" },
              false
            ).model,
          };
          if (
            _.isEqual(duplicate.id, original.id) &&
            _.isEqual(duplicate.name, original.name) &&
            _.isEqual(
              duplicate.variations[0].primary,
              original.variations[0].primary
            ) &&
            _.isEqual(
              duplicate.variations[0].items,
              original.variations[0].items
            )
          ) {
            // Add merged slice to logs
            var slice = {};
            slice["legacy_id"] = key;
            slice["type"] = ct.id;
            slice["new_id"] = `${key}`;

            logs.merged_slices.push(slice);

            console.log(
              "SLICE MERGED",
              `\nSlice ${key} from ${ct.id} has the same name, id and structure as migrated slice ${key}, so it has been merged in ${key}.\nNo action required on data models or content.\n\n`
            );

            return [key, { type: "SharedSlice" }];
          } else {
            fs.mkdirSync(`./migrated/slices/${key}_type_${ct.id}`);

            let str = JSON.stringify(
              {
                ...migrate.default(
                  val,
                  { sliceName: key, from: "slices" },
                  { cwd: "./" },
                  false
                ).model,
                migrated: undefined,
              },
              null,
              2
            );

            str = str.replace(
              `\"id\": \"${key}\"`,
              `\"id\": \"${key}_type_${ct.id}\"`
            );

            str = str.replace(
              `\"name\": \"${key}\"`,
              `\"name\": \"${key}_type_${ct.id}\"`
            );

            fs.writeFileSync(
              `./migrated/slices/${key}_type_${ct.id}/model.json`,
              str
            );

            // Add new slice to logs
            var slice = {};
            slice["legacy_id"] = key;
            slice["type"] = ct.id;
            slice["new_id"] = `${key}_type_${ct.id}`;

            logs.created_slices.push(slice);

            console.log(
              "SLICE CREATED",
              `\nSlice ${key} already exists but doesn't have the same structure as the slice being migrated.\nIt will be named ${key}_type_${ct.id} and will be renamed during content migration as well.\nIf you wish to merge those slices, you can create a variation in /slices/${key}/model.json for ${key}_type_${ct.id}.\To make a variation of ${key}_type_${ct.id} in /slices/${key}/model.json, see section After data model migration in the Migration guide\n\n`
            );

            return [`${key}_type_${ct.id}`, { type: "SharedSlice" }];
          }
        }
      })
    ),
  },
});

(() => {
  
  fetch("https://customtypes.prismic.io/customtypes", {
    headers: HEADERS,
  })
    .then((res) => res.json())
    .then((cts) => {
      let str = JSON.stringify(cts);
      str = str.replaceAll('"body":', '"slices":'); // This line can be removed, but if so, you need to remove it from migrate-content.js as well
      cts = JSON.parse(str);

      cts.forEach((ct) => {
        const newCt = {
          ...ct,
          json: (() =>
            Object.fromEntries(
              Object.entries(ct.json).map(([tabKey, tab]) => [
                tabKey,
                Object.fromEntries(
                  Object.entries(tab).map(([fieldKey, field]) => {
                    if (field.type === "Slices") {
                      // Add tab Slice zone to logs
                      var slice_zone = {};
                      slice_zone["type"] = ct.id;
                      slice_zone["tab"] = tabKey;
                      slice_zone["id"] = fieldKey;

                      logs.slice_zones.push(slice_zone);

                      return [fieldKey, handleSlicezone(field, ct)];
                    }
                    return [fieldKey, field];
                  })
                ),
              ])
            ))(),
        };

        fs.mkdirSync(`./migrated/customtypes/${newCt.id}`); // contains your SM supported custom type

        fs.writeFileSync(
          `./migrated/customtypes/${newCt.id}/index.json`,
          JSON.stringify(newCt, null, 2)
        );
      });

      // Create log file
      fs.writeFileSync(`./migrated/logs.json`, JSON.stringify(logs, null, 2));
    });

  })();
  
