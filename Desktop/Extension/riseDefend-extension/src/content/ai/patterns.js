export const GAMBLING_COMBINATIONS = [
  ["odds", "markets", "deposit"],
  ["bet slip", "stake", "odds"],
  ["live betting", "deposit", "withdraw"],
  ["jackpot", "deposit", "withdraw"],
  ["sportsbook", "odds", "markets"],
  ["casino", "deposit", "withdraw"],
  ["betting", "odds", "stake"],
  ["free bet", "promo code", "deposit"],
  ["bet slip", "stake", "jackpot"],
  ["matches", "odds", "deposit"],
  ["live betting", "teams", "markets"],
  ["parlay", "stake", "odds"],
  ["bookmaker", "odds", "withdraw"],
  ["welcome bonus", "deposit", "betting"]
];

export const SUSPICIOUS_HOSTNAME_PATTERNS = {
  GAMBLING: [
    "bet", "odds", "casino", "sportsbook", "poker", "gambling",
    "jackpot", "wager", "bookmaker", "bingo", "lottery", "betika",
    "betway", "1xbet", "sportybet", "melbet", "22bet", "bet365",
    "draftkings", "fanduel", "paddy", "ladbrokes", "unibet",
    "punter", "punting", "wagering", "casinobet", "livecasino"
  ],
  PORNOGRAPHY: [
    "porn", "xxx", "sex", "nude", "adult", "nsfw", "erotic",
    "xvideo", "xhamster", "redtube", "youporn", "brazzers",
    "hentai", "cam4", "chaturbate", "stripchat", "livejasmin",
    "escort", "onlyfans", "fansonly", "milf", "fetish"
  ],
  DRUGS: [
    "buydrugs", "drugmarket", "darkmarket", "vendor", "narco",
    "pillshop", "rxshop", "buycocaine", "buymeth", "darkweb",
    "silkroad", "alphabay", "weedshop", "cannabisshop",
    "shroomshop", "psychedelics", "chemicalshop"
  ]
};

export const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
