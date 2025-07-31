(async () => {
  const ARTICLE_URL_KEYWORDS = ['ArticleRead.nhn', 'articleid='];

  if (window.name !== 'cafe_main' || !ARTICLE_URL_KEYWORDS.some((e) => window.location.href.includes(e))) {
    return;
  }

  let result = await chrome.storage.local.get(['cafe_comment_write_position']);
  if (!result.cafe_comment_write_position) {
    return;
  }

  const tryOrder = (count = 0) => {
    if (count > 50) {
      return;
    }

    const writer = document.querySelector('.CommentWriter');
    if (!writer) {
      setTimeout(() => tryOrder(count + 1), 100);
      return;
    }

    writer.parentNode.firstChild.before(writer);
  }

  try {
    tryOrder();
  } catch {};
})();
