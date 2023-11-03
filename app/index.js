import { promises as fs } from 'fs';
import fetch from 'node-fetch';
import Parser from 'rss-parser';

import { PLACEHOLDERS, NUMBER_OF } from './constants.js';

const parser = new Parser();

const { YOUTUBE_API_KEY } = process.env;
// const INSTAGRAM_REGEXP = new RegExp(
//   /<script type="text\/javascript">window\._sharedData = (.*);<\/script>/
// );

const getLatestArticlesFromBlog = () =>
  parser
    .parseURL('https://pablosirera.com/feed.xml')
    .then((data) => data.items);

// const getPhotosFromInstagram = async () => {
//   const response = await fetch(`https://www.instagram.com/pablodeveloper/`);
//   const text = await response.text();
//   const json = await Promise.resolve(JSON.parse(text.match(INSTAGRAM_REGEXP)[1]));
//   const edges = json.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges.splice(
//     0,
//     8
//   );
//   return edges.map(({ node }) => ({
//     permalink: `https://www.instagram.com/p/${node.shortcode}/`,
//     media_url: node.thumbnail_src,
//   }));
// };

const getLatestYoutubeVideos = id =>
  fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&maxResults=${NUMBER_OF.VIDEOS}&key=${YOUTUBE_API_KEY}`
  )
    .then((res) => res.json())
    .then((videos) => videos.items);

// const generateInstagramHTML = ({ media_url, permalink }) => `
// <a href='${permalink}' target='_blank'>
//   <img width='20%' src='${media_url}' alt='Instagram photo' />
// </a>`;

const generateYoutubeHTML = ({ title, videoId }) => `
<a href='https://youtu.be/${videoId}' target='_blank'>
  <img width='30%' src='https://img.youtube.com/vi/${videoId}/mqdefault.jpg' alt='${title}' />
</a>`;

(async () => {
  // const [template, articles, videos, photos] = await Promise.all([
  const [template, articles, videos, videosLive] = await Promise.all([
    fs.readFile('./app/README.md.tpl', { encoding: 'utf-8' }),
    getLatestArticlesFromBlog(),
    getLatestYoutubeVideos('UUl41m8HBifhzM6Dh1V04wqA'),
    getLatestYoutubeVideos('UCwiPM-YnxouqHdYtPVtfS0Q'),
    // getPhotosFromInstagram(),
  ]);

  // create latest articles markdown
  const latestArticlesMarkdown = articles
    .slice(0, NUMBER_OF.ARTICLES)
    .map(({ title, link }) => `- [${title}](${link})`)
    .join('\n');

  // create latest youtube videos channel
  let latestYoutubeVideos, latestYoutubeLiveVideos;

  if (videos) {
    latestYoutubeVideos = videos
      .map(({ snippet }) => {
        const { title, resourceId } = snippet;
        const { videoId } = resourceId;
        return generateYoutubeHTML({ videoId, title });
      })
      .join('');
  }

  if (videosLive) {
    latestYoutubeLiveVideos = videosLive
      .map(({ snippet }) => {
        const { title, resourceId } = snippet;
        const { videoId } = resourceId;
        return generateYoutubeHTML({ videoId, title });
      })
      .join('');
  }

  // create latest photos from instagram
  // const latestInstagramPhotos = photos
  //   .slice(0, NUMBER_OF.PHOTOS)
  //   .map(generateInstagramHTML)
  //   .join('');

  // replace all placeholders with info
  const newMarkdown = template
    .replace(PLACEHOLDERS.LATEST_ARTICLES, latestArticlesMarkdown)
    .replace(PLACEHOLDERS.LATEST_YOUTUBE, latestYoutubeVideos)
    .replace(PLACEHOLDERS.LATEST_LIVE_YOUTUBE, latestYoutubeLiveVideos);
    // .replace(PLACEHOLDERS.LATEST_INSTAGRAM, latestInstagramPhotos);

  await fs.writeFile('README.md', newMarkdown);
})();
