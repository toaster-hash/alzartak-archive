const safeQuerySelector = async (selector, limit = 50, current = 0) => {
  if (current > limit) {
    return null
  }

  const result = document.body.querySelector(selector);
  if (result) {
    return result;
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  return await safeQuerySelector(selector, limit, current + 1);
};

const safeQuerySelectorAll = async (selector, limit = 50, current = 0) => {
  if (current > limit) {
    return null
  }

  const result = document.body.querySelectorAll(selector);
  if (result.length > 0) {
    return Array.from(result);
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  return await safeQuerySelectorAll(selector, limit, current + 1);
};