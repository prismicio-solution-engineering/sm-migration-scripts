import * as prismic from "@prismicio/client";
import fs from "fs";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import archiver from "archiver";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

dotenv.config();

// Query old and new repos
const oldClient = prismic.createClient(
  `https://${process.env.REPO}.cdn.prismic.io/api/v2`,
  {
    fetch,
    // accessToken: "Your access token here if API is private",
  }
);
const newClient = prismic.createClient(
  `https://${process.env.NEWREPO}.cdn.prismic.io/api/v2`,
  {
    fetch,
    // accessToken: "Your access token here if API is private",
  }
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const directoryPath = path.join(__dirname, "exports/sm_docs");

// Build a type comparison table between old documents and new document
async function getComparisonTable() {
  let table = [{ type: null, uid: null, old: null, new: null, lang: null }];

  // Get all documents with dangerouslyGetAll
  const oldDocuments = await oldClient.dangerouslyGetAll({ lang: "*" });

  let i = 0;

  oldDocuments.forEach((element) => {
    table[i] = {};
    table[i].type = element.type;
    table[i].uid = element.uid;
    table[i].old = element.id;
    table[i].lang = element.lang;
    i++;
  });

  const newDocuments = await newClient.dangerouslyGetAll({ lang: "*" });

  const newTable = newDocuments
    .map((element) => {
      const index = table.findIndex(
        (line) =>
          line.uid === element.uid &&
          line.type === element.type &&
          line.lang === element.lang
      );
      if (index !== -1) {
        return {
          ...table[index],
          new: element.id,
        };
        //newTable[index].new = element.id;
      }
      return null;
    })
    .filter((line) => line);

  return newTable;
}

//Update all content relationship links in all new documents from old TYPE documentID to new documentId
async function updateContentRelationships() {
  const comparisonTable = await getComparisonTable();

  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      return console.log("Unable to scan directory: " + err);
    }

    //listing all files
    files.forEach(function (file) {
      if (!file.startsWith(".")) {
        const fileData = require(path.join(__dirname, "exports/sm_docs", file));

        // Look for CR links in primary section
        Object.keys(fileData).forEach(function (field) {
          if (
            fileData[field] &&
            fileData[field].wioUrl !== undefined &&
            comparisonTable.find((item) => item.old === fileData[field].id)
          ) {
            let newContentId = comparisonTable.find(
              (item) => item.old === fileData[field].id
            ).new;
            fileData[field].wioUrl = "wio://documents/" + newContentId;
            fileData[field].id = newContentId;
          }

          if (Array.isArray(fileData[field])) {
            fileData[field].forEach(function (subField, index) {
              Object.keys(fileData[field][index]).forEach(function (subField) {
                if (
                  fileData[field][index][subField] &&
                  fileData[field][index][subField].wioUrl !== undefined &&
                  comparisonTable.find(
                    (item) => item.old === fileData[field][index][subField].id
                  )
                ) {
                  let newContentId = comparisonTable.find(
                    (item) => item.old === fileData[field][index][subField].id
                  ).new;
                  fileData[field][index][subField].wioUrl =
                    "wio://documents/" + newContentId;
                  fileData[field][index][subField].id = newContentId;
                }

                if (isRichText(fileData[field][index][subField])) {
                  fileData[field][index][subField].forEach(function (
                    richTextItem,
                    richTextIndex
                  ) {
                    richTextItem.content.spans.forEach((span, spanIndex) => {
                      if (
                        span.data?.wioUrl !== undefined &&
                        comparisonTable.find(
                          (item) => item.old === span.data?.id
                        )
                      ) {
                        let newContentId = comparisonTable.find(
                          (item) => item.old === span.data.id
                        ).new;
                        fileData[field][richTextIndex].content.spans[
                          spanIndex
                        ].data.wioUrl = "wio://documents/" + newContentId;
                        fileData[field][richTextIndex].content.spans[
                          spanIndex
                        ].data.id = newContentId;
                      }
                    });
                  });
                }
              });
            });
          }

          if (isRichText(fileData[field])) {
            fileData[field].forEach(function (richTextItem, richTextIndex) {
              richTextItem.content.spans.forEach((span, spanIndex) => {
                if (
                  span.data?.wioUrl !== undefined &&
                  comparisonTable.find((item) => item.old === span.data?.id)
                ) {
                  let newContentId = comparisonTable.find(
                    (item) => item.old === span.data.id
                  ).new;
                  fileData[field][richTextIndex].content.spans[
                    spanIndex
                  ].data.wioUrl = "wio://documents/" + newContentId;
                  fileData[field][richTextIndex].content.spans[
                    spanIndex
                  ].data.id = newContentId;
                }
              });
            });
          }
        });

        //Look for CR links in slices
        fileData.slices?.forEach(function (slice) {
          Object.keys(slice.value.primary).forEach(function (field) {
            if (
              slice.value.primary[field] &&
              (slice.value.primary[field].wioUrl !== undefined) &
                comparisonTable.find(
                  (item) => item.old === slice.value.primary[field].id
                )
            ) {
              let newContentId = comparisonTable.find(
                (item) => item.old === slice.value.primary[field].id
              ).new;
              slice.value.primary[field].wioUrl =
                "wio://documents/" + newContentId;
              slice.value.primary[field].id = newContentId;
            }

            if (isRichText(slice.value.primary[field])) {
              slice.value.primary[field].forEach(function (
                richTextItem,
                richTextIndex
              ) {
                richTextItem.content.spans.forEach((span, spanIndex) => {
                  if (
                    span.data?.wioUrl !== undefined &&
                    comparisonTable.find((item) => item.old === span.data?.id)
                  ) {
                    let newContentId = comparisonTable.find(
                      (item) => item.old === span.data.id
                    ).new;
                    slice.value.primary[field][richTextIndex].content.spans[
                      spanIndex
                    ].data.wioUrl = "wio://documents/" + newContentId;
                    slice.value.primary[field][richTextIndex].content.spans[
                      spanIndex
                    ].data.id = newContentId;
                  }
                });
              });
            }
          });
          slice.value.items.forEach(function (field, index) {
            Object.keys(slice.value.items[index]).forEach(function (subField) {
              if (
                slice.value.items[index][subField] &&
                slice.value.items[index][subField].wioUrl !== undefined &&
                comparisonTable.find(
                  (item) => item.old === slice.value.items[index][subField].id
                )
              ) {
                let newContentId = comparisonTable.find(
                  (item) => item.old === slice.value.items[index][subField].id
                ).new;
                slice.value.items[index][subField].wioUrl =
                  "wio://documents/" + newContentId;
                slice.value.items[index][subField].id = newContentId;
              }

              if (isRichText(slice.value.items[index][subField])) {
                slice.value.items[index][subField].forEach(function (
                  richTextItem,
                  richTextIndex
                ) {
                  richTextItem.content.spans.forEach((span, spanIndex) => {
                    if (
                      span.data?.wioUrl !== undefined &&
                      comparisonTable.find((item) => item.old === span.data?.id)
                    ) {
                      let newContentId = comparisonTable.find(
                        (item) => item.old === span.data.id
                      ).new;
                      slice.value.items[index][subField][
                        richTextIndex
                      ].content.spans[spanIndex].data.wioUrl =
                        "wio://documents/" + newContentId;
                      slice.value.items[index][subField][
                        richTextIndex
                      ].content.spans[spanIndex].data.id = newContentId;
                    }
                  });
                });
              }
            });
          });
        });
        fs.writeFile(
          path.join(__dirname, "migrated/content/linked_files", file),
          JSON.stringify(fileData, null, 2),
          function writeJSON(err) {
            if (err) return console.log(err);
            console.log(
              "writing to " +
                path.join(__dirname, "migrated/content/linked_files", file)
            );
          }
        );
      }
    });

    var output = fs.createWriteStream("migrated/content/links.zip");
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
    archive.directory("migrated/content/linked_files", false);

    archive.finalize();
  });
}

updateContentRelationships();

function isRichText(field) {
  if (
    Array.isArray(field) &&
    field.length > 0 &&
    (field[0].type === "paragraph" ||
      field[0].type === "heading1" ||
      field[0].type === "heading2" ||
      field[0].type === "heading3" ||
      field[0].type === "heading4" ||
      field[0].type === "heading5" ||
      field[0].type === "heading6" ||
      field[0].type === "list-item" ||
      field[0].type === "o-list-item")
  ) {
    return true;
  }
  return false;
}
