These scripts were built by Prismic SE team to help customers migrate their repository from legacy to Slice Machine.<br/>
The guide still needs to be thoroughly tested.

<br/>

<details>
    <summary>
        What are the differences between a legacy project and a slice machine project
    </summary>

- Data models
    - Slices are shared between custom types
    - Slices can have variations
    - Slice can be organized in libraries

- Slice simulator
    - This is a features that previews your slice’s component as you update it in that’s slice `index.js`
    - It also enables screenshots of the component to be taken. The screenshot is then displayed in the slice library and in the editing platform

</details>

<details>
    <summary>
        Advantages of migrating to Slice Machine
    </summary>

- SliceMachine is the new way to build with Prismic, so using it will give access to new features and updates
- Slices are unified, they do not depend on a custom type
- Slice libraries and custom types can be shared between projects
- Your slices and custom types are centralized in your code
    - It becomes easier to follow your git workflow, you can version your slices
    - You can locally build your slice from scratch and iterate fast before delivering it by using the slice simulator

</details> 

<details>
    <summary>
        Information to keep in mind
    </summary>

- To migrate your project, your future project **must use Next.js or Nuxt.js** as they are currently (Nov 2022) the only frameworks supported by Slice Machine.
- This guide will walk you through the migration of a project using Next.js (would be the same with Nuxt.js).
- Needed setup for migration
    - You will need a new repository that is compatible with Slice Machine. To have one, you’ll need to set up a new Next.js or Nuxt.js repository.
        - This is because slices structure are changing with SliceMachine and this prevents any impact on production
    - In your legacy repository, you’ll need to set up a token for the Custom Types API (in Settings > API & Security > Custom Types API tab)
    - Your legacy and new repositories will both need the Import / Export feature enabled
- The Import / Export feature has limitations, here the main ones related to this migration :
    - Documents
        - All published documents are exported but not the releases, drafts, or archived documents.
        - You can import up to 200 documents. If you need to import more than 200 documents, you will need to zip the generated JSONs 200 by 200. You can launch 10 import jobs per hour.
    - Media
        - Images will be imported without private notes, copyright, and croppings.
        - If an image fields has a different image for each responsive view, the default one will be imported and the other responsive views will be ignored because responsive views are generated on the fly by the editing platform. We recommend you to make an inventory of the images and their responsive views in case you need to set them up after migration.
        - Retrying Import jobs several times could lead to duplicates in the Media Library.
    
    More information about the [Export tool limitations](https://prismic.io/docs/technologies/import-export#export-tool) and the [Import tool limitations](https://prismic.io/docs/technologies/import-export#import-tool) 
    
    With this migration you’re not affecting your production website, you are just extracting data models and content from your production repository.

</details> 

<br/>
<br/>

In this guide :
- [Before migration](#before-migration)
- [Step 1 : Data model migration](#step-1--data-model-migration)
- [Step 2 : Migrate your content](#step-2--migrate-your-content)
- [Step 3 : Migrate your links](#step-3--migrate-your-links)
- [After Migration](#after-migration)

<br/>
<br/>


# Before migration
<details>
    <summary>
        Set up a new Slice Machine project
    </summary>

  1. Create a new NextJS project
  2. [Set up Prismic](https://prismic.io/docs/technologies/setup-nextjs) and Slice Machine, in this process you will also create a new repository in your Prismic dashboard
  3. Check your configuration :
    - If you have **locales** in the legacy project, create the exact same in your new project
    - If you have **integration fields**, make sure to create the same integration fields in your new repository (same name)

</details>

<details>
    <summary>
    Preparing your data models
    </summary>

In your legacy project (in production or in an environment), make sure all the documents are identifiable so internal links can be reconciled.
- Every repeatable custom type must have a UID field set and filled in the associated documents.
- If UIDs are missing, links won’t be able to be migrated and you will have to manually map and reintegrate them after the process.
- Note: You can also use another field for reconciliation (you need to edit the script) but UID guarantees uniqueness, though it is recommended
</details>

<br/>
<br/>

# Step 1 : Data model migration

<details>
    <summary>
    What does the script do
    </summary>

- In this part, you will migrate your slices and custom types
- The script fetches your data models and outputs them in a a format supported by Slice Machine
- It also checks all slices making sure you don’t have multiple slices with the same ID but different structure.
- If needed it will generate new slices or merge slices in case of duplicate names
    - If you have multiple slices with the same ID
        - The first slice will be migrated as it is in `/slices/{key}`,
        - If the other slice have the same structure (same fields) they will be merged.
        - If they do not share the same structure, name and ID, a whole new slice will be created in `/slices/{key}-type_{ct.label}`, named with its id and its type id (`slice_id_type_type_id`)
        - You can then either keep them separated or create variations after migration - See [After migration](#after-migration) section
- All slices merged or created are then logged in a file used in the next step by the content migration script. This file also has data about the different slice zones available in your custom types.
</details>

<details>
    <summary>
        Data models migration steps
    </summary>

1. After installing sm-script, run `cd sm-scripts` then `npm install`
2. Create a `.env` file at the root of the script folder and create your `REPO`, `TOKEN` and `NEWREPO` 
    
    
    ```jsx
    REPO=[Your legacy repository id]
    TOKEN=[Your legacy repository token]
    NEWREPO=[Your Slice Machine repository id]
    ```
    
    The token value can be found in your legacy repository under **Settings > API & Security > Custom Type API tab**
3. **Follow this step if you have a mix of SharedSlices and legacy slices**
    </br> You need to let your Customer success manager know about it.
    </br> We created an additional script to run before Step 1 in order to avoid errors.    
    </br> Run `node copy-sm.mjs`.
    </br> This script fetches SharedSlices (slices created with slice machine) and generate the corresponding files in the `slices/` folder.

4. You need to make sure your project doesn't have a mix of SharedSlices (built with Slice Machine) and legacy slices. If it does, follow the previous step.
    </br> Run `node migrate-cts.mjs`.
    </br> This will generate `slices` and `customtypes` folders containing the migrated slices and custom types
5. Copy the `slices` and `customtypes` folders and paste them at the root of your NextJS app
6. Run `npm run slicemachine`
7. Check that all slices and custom types have been generated in Slice Machine
8. Still in SM, edit a slice and save the data model, it will generate the `slices/index.js` that lists all your slices. (you can then remove this change if you want and save again the data model)
9. Push to your changes
</details>

<details>
    <summary>
    After data model migration
    </summary>

- If you have integration fields
    - In the “Before Migration Setup” phase you should have done this : In your new repository, go to **Settings > Integration fields** and create your new integration field using the same data source as the one from your legacy repository
    - For the migrated slices using integration fields, update the `"catalog"` value in  `model.json` with the new endpoint generated in your new Prismic repository.
    - Push the slice to Prismic
- If you want to create libraries follow [this documentation](https://prismic.io/docs/slice-machine#slice-libraries)
</details>


<br/>
<br/>

# Step 2 : Migrate your content

<details>
    <summary>
    What does this script do
    </summary>

- This script will adapt the structure of the content to be compatible with Slice Machine data models relying on previously generated `logs.json` and exported documents from your legacy repository.
- It will also generate file names that can be handled by the import tool in case of multiple locales.
</details>

<details>
    <summary>
        Content migration steps
    </summary>

1. Export your content from the original legacy repository
2. Place the unziped files in `exports/legacy_docs`
3. Run `node migrate-content.js`
</details>

<details>
    <summary>
        After content migration
    </summary>

- Import the `migrated/content/content.zip` file in your Prismic slice machine project repository.
- If you want to check the documents, you will find all migrated files in `migrated/content/files`.
- If you have more than 200 documents to import, you will need to create multiple zip files to import them in your Prismic repository.
- If you are using GraphQuery, update your queries
    - Update the slices name if you changed them
    - Do not forget to add `variation` in the slices paths
    - Replace `body` with `slices`
    - Replace `repeat` with `items`
    - Replace `non-repeat` with `primary`
    - Example :
        
        ```jsx
        export const homeArticlesGraphQuery =`
        {
            homepage {
                slices {
                    ...on featured_articles {
                        variation {
                            ...on withContentRelationship {
                                items {
                                    linked_article {
                                        ...on blog_article {
                                            ...blog_articleFields
                                            author {
                                                ...on author {
                                                    name
                                                    image
                                                }
                                            }
                                        }
                                    }
                                }
                                primary {
                                    ...primaryFields
                                }
                            }
                        }
                    }
                }
            }
        }
        `
        ```

</details>

<br/>
<br/>

# Step 3 : Migrate your links

The final step of the project migration is to map your old links with the new ones generated after content migration.

<br/>

<details>
    <summary>
        What does this script do
    </summary>

- After migrating your content you’ll notice in the editing platform that all internal links are broken. That’s because the links are based on the legacy project documents ID.
- The last script reconciles the documents by building a comparison table between document types then updates the internal links.
- If you have a lot of documents, be careful, the script is using getDangerouslyAll method that returns all of your documents.

</details>

<details>
    <summary>
        Migration steps
    </summary>

1. From your SM repository, if it is not done, publish the release created after the import
2. Export the documents
3. Unzip the files and place them in the `exports/sm_docs`
4. Run `node migrate-links.mjs`

</details>

<details>
    <summary>
        After links migration
    </summary>

- If you want to check the documents, you will find all migrated files in `migrated/content/linked_files`.
- If you have more than 200 documents to import, you will need to create multiple zip files to import them in your Prismic repository.

1. Import  `migrated/content/links.zip` in your slice machine repository. This will create a release containing your documents with the new links. There’s no need to delete the documents that are already published.

2. Check the generated release that all links are not broken. You can check each file or preview the release to do so.

</details>

<br/>
<br/>

# After Migration

<details>
    <summary>
        Update your code
    </summary>

- Make sure all your react components in the correct `slice/ExampleSlice/index.js` file.
    - You will need to create an `index.js` file in each slice folder.  This step can be done after the whole migration project is done. Copy and paste your existing components in the `index.js` or build it from scratch using the slice simulator.
- Also don’t forget to update the components that use slices variations.
- Update your packages
    - If you copied your original components and pages to your new project, make sure the imported dependencies are the latest ones ([installed during the project set up](https://prismic.io/docs/setup-nextjs#run-setup-command).)
    - Package migration guides :
      - https://prismic.io/docs/prismic-client-v6-migration-guide
      - https://prismic.io/docs/prismic-react-v2-migration-guide

</details>

<details>
    <summary>
        If you want to create variations
    </summary>

  - Variations are versions of a slice and can only be created through Slice Machine.
  - Determine the slices to group into variations : [more information about variations](https://prismic.io/docs/technologies/slice-machine#add-a-slice-variation)
  - Example use case :
      - If you have 2 hero banner slices, one with a CTA and the other without a CTA, you should consider merging them into 1 slice using variations.
      - To do so, after after your data models are migrated, you can use the hero banner with CTA as the default slice. You’d add a variation to it called “Without CTA” via Slice Machine and paste the content of the second hero banner (without CTA) model.json default variation.
  - If you want to create variations, we recommend to follow the steps bellow after migrating the whole project.
  - You could also do so after migrating your data models but you should also make sure to log somewhere which slices are turned into variation to update your content accordingly afterwards.
    
    ```json
    {
        "id": "hero_section",
        ...
        "variations": [
            {
                "id": "default",
                    ...
                    "primary": {...},
                    "items": {...},
                    "imageUrl": "https://images.prismic.io/slice-machine/..."
            },
            {
                "id": "withTwoCtas", 
                    ...
                    "primary": {...},
                    "items": {...},
                    "imageUrl": "https://images.prismic.io/slice-machine/..."
            },
            {
                "id": "withoutCta",
                    ...
                    "primary": {...},
                    "items": {...},
                    "imageUrl": "https://images.prismic.io/slice-machine/..."
            }
        ]
    }
    ```
    
    1. After the script has ran choose the slices to merge into variations. Among them choose the one that will be the default variation. In the example “Hero section” will be the main slice.
    2. In Slice Machine, select the slice that will be the default (”Hero section”) and add a new variation  (”With two ctas” for example).
        
    3. Add the variations Hero Section structure
        1. From the original slice to merge (Hero Section With Two Ctas), copy the content of  `primary` and `items` objects.
        2. In the slice that will receive the variations (Hero section) `model.json`, in the corresponding variation (with id `with_two_ctas`) replace  `primary` and `items` objects with the content you’ve just copied
        3. Then delete the slice you merged (`HeroSectionWithTwoCtas/` ) from the `slices/` folder.
    4. Repeat the steps 2 and 3 for each variation
    5. Once you’re done creating all your variations, in Slice Machine push your changes
    6. Apply the variation in your content
       - Make sure to conditionally render the fields in your slice's `index.js`
       - Specify the variation to use in your migrated content

</details>

<details>
    <summary>
        Check your content
    </summary>

If a appear empty in the  :
  - It was probably merged. In that case, you’ll need to manually create the missing slice using Slice Machine
  - If it is similar to a slice that was already successfully migrated, we recommend creating a variation in that slice

</details>
