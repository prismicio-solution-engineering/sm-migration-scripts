const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

function migrateContent() {
  // Create directories
  fs.mkdirSync("./migrated/content"); // Will contain content.zip and links.zip
  fs.mkdirSync("./migrated/content/files"); // Will contain migrated files before links migration
  fs.mkdirSync("./migrated/content/linked_files"); // Will contain migrated files with links generated

  // Get the data model changes logs
  const logs = JSON.parse(fs.readFileSync("./migrated/logs.json"));

  fs.readdir(
    path.join(__dirname, "exports/legacy_docs"),
    function (err, files) {
      if (err) {
        return console.log("Unable to scan directory: " + err);
      }
      // Listing all files
      files.forEach(function (file, index) {
        if (!file.startsWith(".")) {
          let fileData = require(path.join(
            __dirname,
            "exports/legacy_docs",
            file
          ));

          // Handle slices variations using logs
          logs.slice_zones.forEach((sz) => {

            // Look for new slices created
            const nSlice = logs.created_slices?.filter(
              (slice) => slice.type === fileData.type
            );

            // Replace legacy values
            let str = JSON.stringify(fileData);

            str = str.replace('"body":', '"slices":'); // If removed from migrate-cts.mjs, remove this line
            str = str.replaceAll('"repeat":', '"items":');
            str = str.replaceAll('"non-repeat":', '"primary":');

            if (logs.created_slices.length && nSlice.length) {
              nSlice.forEach((item) => {
                str = str.replaceAll(`"${item.legacy_id}$`, `"${item.new_id}$`);
              });
            }

            fileData = JSON.parse(str);

            // Add variation to all slice zones
            if (sz.type === fileData.type && fileData[sz.id]) {
              fileData[sz.id].forEach(function (slice) {
                slice.value.variation = "default-slice";
              });
            }
          });

          // If locales exists, handle file name
          if (fileData.grouplang) {

            // Replace underscores if they exist in the grouplang or import will fail
            if (fileData.grouplang.includes("_")){
              console.log(fileData.grouplang.includes("_"), fileData.grouplang);
              let lang = JSON.stringify(fileData.grouplang).replaceAll("_", "-");
              fileData.grouplang = JSON.parse(lang);
              console.log(lang, "NEW FILE", fileData.grouplang)
            }

            fs.writeFile(
              path.join(
                __dirname,
                "migrated/content/files",
                `new_${fileData.grouplang}_${fileData.lang}.json`
              ),
              JSON.stringify(fileData, null, 2),
              function writeJSON(err) {
                if (err) return console.log(err);
                console.log(
                  "writing to " +
                    path.join(
                      __dirname,
                      "migrated/content/files",
                      `new_${fileData.grouplang}_${fileData.lang}.json`
                    )
                );
              }
            );
          } else {
            fs.writeFile(
              path.join(
                __dirname,
                "migrated/content/files",
                index + "_migrated.json"
              ),
              JSON.stringify(fileData, null, 2),
              function writeJSON(err) {
                if (err) return console.log(err);
                console.log(
                  "writing to " +
                    path.join(
                      __dirname,
                      "migrated/content/files",
                      index + "_migrated.json"
                    )
                );
              }
            );
          }
        }
      });

      var output = fs.createWriteStream("migrated/content/content.zip");
      var archive = archiver("zip");

      output.on("close", function () {
        console.log(archive.pointer() + " total bytes");
        console.log(
          "archiver has been finalized and the output file descriptor has closed."
        );
      });

      archive.on("error", function (err) {
        throw err;
      });

      archive.pipe(output);

      // append files from a sub-directory, putting its contents at the root of archive
      archive.directory("migrated/content/files", false);

      archive.finalize();
    }
  );
}

migrateContent();
