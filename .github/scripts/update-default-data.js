import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiPath = 'https://nomanssky.fandom.com/api.php';
const MIN_REQUEST_INTERVAL = 35000; // 35 seconds between fetchs

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const filterValidData = (data) => {
  return data.filter(item =>
    item.title.civilizeD &&
    item.title.civilizeD !== 'Uncharted' &&
    item.title.coordinateS &&
    item.title.galaxY &&
    item.title.pageName
  );
};

const fetchCivilizationsPage = async (offset = 0) => {
  const params = new URLSearchParams();
  params.append('action', 'cargoquery');
  params.append('tables', 'Regions');
  params.append('fields', 'Regions.Civilized=civilizeD,Regions.Galaxy=galaxY,Regions.Coordinates=coordinateS,_pageName=pageName');
  params.append('group_by', '_pageName');
  params.append('order_by', '_pageName');
  params.append('limit', '500');
  params.append('offset', offset.toString());
  params.append('format', 'json');
  params.append('origin', '*');

  const url = `${apiPath}?${params.toString()}`;
  console.log(`Fetching page with offset: ${offset}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.cargoquery || [];
};

const fetchAllCivilizationsAndRegions = async () => {
  console.log('Starting data fetch...');
  let allData = [];
  let offset = 0;
  let hasMore = true;
  let requestCount = 0;

  while (hasMore) {
    try {
      const pageData = await fetchCivilizationsPage(offset);
      const validPageData = filterValidData(pageData);
      
      console.log(`Page ${requestCount + 1}: ${pageData.length} raw items, ${validPageData.length} valid items`);

      if (pageData.length === 0) {
        hasMore = false;
        console.log('No more data available');
      } else {
        allData = allData.concat(validPageData);
        requestCount++;

        console.log(`Total valid items so far: ${allData.length}`);
        
        if (pageData.length < 50) {
          hasMore = false;
          console.log('Last page reached');
        } else {
          offset += 500;
          
          if (hasMore) {
            console.log(`Waiting ${MIN_REQUEST_INTERVAL}ms before next request...`);
            await sleep(MIN_REQUEST_INTERVAL);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching page:', error);
      throw error;
    }
  }

  console.log(`Total valid items fetched: ${allData.length}`);

  if (allData.length > 0) {
    const galaxies = [...new Set(
      allData.map(item => item.title.galaxY)
    )].filter(Boolean).sort();
    
    const data = {};
    
    galaxies.forEach(galaxy => {
      data[galaxy] = {
        civilizations: [],
        regions: {}
      };
      
      const galaxyData = allData.filter(item => item.title.galaxY === galaxy);
      const civilizations = [...new Set(
        galaxyData.map(item => item.title.civilizeD)
      )].sort();
      
      data[galaxy].civilizations = civilizations;
      
      civilizations.forEach(civ => {
        data[galaxy].regions[civ] = galaxyData
          .filter(item => item.title.civilizeD === civ)
          .map(item => ({
            name: item.title.pageName,
            coordinates: item.title.coordinateS,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      });
    });
    
    return { galaxies, data };
  } else {
    throw new Error('No valid data could be fetched');
  }
};

const main = async () => {
  try {
    console.log('=== Starting defaultData.json update ===');
    
    const result = await fetchAllCivilizationsAndRegions();
    
    const outputPath = path.join(__dirname, '../../public/assets/defaultData/defaultData.json');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    console.log(`=== Data successfully saved to ${outputPath} ===`);
    console.log(`Total galaxies: ${result.galaxies.length}`);
    console.log(`Total civilizations: ${Object.values(result.data).reduce((sum, g) => sum + g.civilizations.length, 0)}`);
    
  } catch (error) {
    console.error('=== Error updating data ===');
    console.error(error);
    process.exit(1);
  }
};

main();