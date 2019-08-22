const erfc = require('compute-erfc');

// Constants
const maxtesprice = 0.25;
const mintesprice = 0.005;
const calibrate = 1.0;

// User data from user table

var user = {
  usern: 'user',
  debt: {             // asset
    amount: 0,
    symbol: {
      name: 'VIG',
      decimals: 4
    }
  },

  collateral: [],     // assets
  insurance: [],

  valueofcol: 0.0, // dollar value of user portfolio of collateral crypto assets
  valueofins: 0.0, // dollar value of user portfolio of insurance crypto assets

  tesprice: 0.0, // annualized rate borrowers pay in periodic premiums to insure their collateral
  pcts: 0.0, // percent contribution to solvency (weighted marginal contribution to risk (solvency) rescaled by sum of that
  volcol: 1.0, // volatility of the user collateral portfolio
  stresscol: 0.0, // model suggested percentage loss that the user collateral portfolio would experience in a stress event.
  istresscol: 0.0, // market determined implied percentage loss that the user collateral portfolio would experience in a stress event.
  svalueofcol: 0.0, // model suggested dollar value of the user collateral portfolio in a stress event.
  svalueofcole: 0.0, // model suggested dollar amount of insufficient collateral of a user loan in a stressed market.   min((1 - svalueofcol ) * valueofcol - debt,0)

  feespaid: {         // asset
    amount: 0,
    symbol: {
      name: 'VIG',
      decimals: 4
    }
  },

  creditscore: 500, //out of 800
  lastupdate: 0,
  latepays: 0,
  recaps: 0
};

// Global stats from globals table

var gstats = {
  solvency: 1.0, // solvency, represents capital adequacy to back the stablecoin
  valueofcol: 0.0, // dollar value of total portfolio of borrowers crypto collateral assets
  valueofins: 0.0, // dollar value of total portfolio of insurance crypto assets
  scale: 1.0, // TES pricing model parameters are scaled to drive risk (solvency) to a target set by custodians.
  svalueofcole: 0.0, // model suggested dollar value of the sum of all insufficient collateral in a stressed market SUM_i [ min((1 - svalueofcoli ) * valueofcoli - debti,0) ]
  svalueofins: 0.0, // model suggested dollar value of the total insurance asset portfolio in a stress event. [ (1 - stressins ) * INS ]
  stressins: 0.0, // model suggested percentage loss that the total insurance asset portfolio would experience in a stress event.

  inreserve: {             // VIG
    amount: 0,
    symbol: {
      name: 'VIG',
      decimals: 4
    }
  },
  totaldebt: {             // VIGOR
    amount: 0,
    symbol: {
      name: 'VIGOR',
      decimals: 4
    }
  },

  insurance: [],       // assets
  collateral: []
};


/* premium payments in exchange for contingient payoff in
 * the event that a price threshhold is breached
 */
function vigor_pricing(borrow, user, gstats) {
  const user_debt = user.debt.amount + borrow;  // the total amount the user will be borrowing

  const ivol = user.volcol * gstats.scale; // market determined implied volaility

  // market determined implied percentage loss that the user collateral portfolio would experience in a stress event.
  const istresscol = -1.0 * (Math.exp((Math.log((user.stresscol / -1.0) + 1.0)) * gstats.scale) - 1.0);

  const payoff = Math.max(  0.0,
    1.0 * (user.debt.amount / Math.pow(10.0,4)) - user.valueofcol * (1.0 - istresscol)
  );
  const T = 1.0;
  const d = ((Math.log(user.valueofcol / (user_debt / Math.pow(10.0,4)))) + (-Math.pow(ivol,2)/2.0) * T) / (ivol * Math.sqrt(T));

  // annualized rate borrowers pay in periodic premiums to insure their collateral
  var tesprice = Math.min(Math.max( mintesprice * gstats.scale,
    ((payoff * erfc(d / Math.sqrt(2.0)) / 2.0) / (user_debt / Math.pow(10.0, 4)))) * calibrate, maxtesprice);

  tesprice /= 1.6 * (user.creditscore / 800.0); // credit score of 500 means no discount or penalty.

  return tesprice;
}

// TEST
console.log('If I borrow 100 my price will be:', vigor_pricing(100, user, gstats));
