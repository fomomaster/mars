/**
 * require jquery.js web3.js abi.js
 *
 */
(function () {
  var api = {};

  //contract address
  var address = '0xd0063Fa52dc63DCa7523D8BCf02b8EF54633937e';

  //var endpoint = 'http://127.0.0.1:9545';
  var endpoint = 'https://mainnet.infura.io/v3/d8c35f63217149d0b1946c1a4c3ee390';

  //init web3
  var web3Wallet;
  var defaultAccount;
  var isMainNet = true;
  var accountListnerAction = [];

  // 10 gwei
  var defaultGasPrice = 10000000000;
  var minGasPrice = 3000000000;

  var web3Data;
  var contractIns

  //web3Wallet
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    web3Wallet = new Web3(web3.currentProvider);

    var accountInterval = setInterval(function () {
      if (web3Wallet.eth.accounts[0] !== defaultAccount) {
        defaultAccount = web3Wallet.eth.accounts[0];
        for (let index = 0; index < accountListnerAction.length; index++) {
          accountListnerAction[index](defaultAccount);
        }
      }
    }, 200);

    web3Wallet.eth.getGasPrice(function (err, res) {
      if (err) {
        return;
      }
      var gasPrice = web3Data.toDecimal(res.toString());

      if (gasPrice > minGasPrice) {
        defaultGasPrice = gasPrice;
      } else {
        defaultGasPrice = minGasPrice;
      }
    });

    web3Wallet.version.getNetwork((err, netId) => {
      if (netId == '1') {
        isMainNet = true;
      } else {
        isMainNet = false;
      }
    });
  }

  web3Data = new Web3(new Web3.providers.HttpProvider(endpoint));
  contractIns = web3Data.eth.contract(abi).at(address);

  api.checkWebWallet = function () {
    return !!web3Wallet;
  };

  api.isMainNet = function () {
    return isMainNet;
  };

  /**
   * get web wallet default account
   */
  api.getAccount = function () {
    return defaultAccount;
  };

  /**
   * add account listener
   * @param {functon} action
   */
  api.addAccountListener = function (action) {
    accountListnerAction.push(action);
  }

  /**
   * get current time by server
   * @param {function} callback
   */
  api.getTime = function (callback) {
    // var date = new Date($.ajax({async: false}).getResponseHeader("Date"));
    var date = new Date();
    callback(null, parseInt(date.getTime().toString()));
  }

  /*
  api.getTime = function (callback) {
    $.ajax({
      type: 'GET',
      url: '/scripts/now.php',
      data: {_t: new Date().getTime()},
      dataType: 'json',
      success: function (data) {
        if (!data.success) {
          callback(new Error('getTime error'));
          return;
        }
        callback(null, parseInt(data.data));
      },
      error: function () {
        callback(new Error('getTime error'));
      }
    });
  };
  */

  /**
   * return current round info
   * @param {function} callback
   */
  api.getCurrentRoundInfo = function (callback) {
    contractIns.getCurrentRoundInfo(function (err, res) {
      if (err) {
        callback(err, undefined);
        return;
      }
      var obj = {};
      obj['rndNo'] = web3Data.toDecimal(res[0]);
      obj['eth'] = web3Data.toDecimal(web3Data.fromWei(res[1].toString()));
      obj['keys'] = web3Data.toDecimal(web3Data.fromWei(res[2].toString()));
      obj['startTime'] = web3Data.toDecimal(res[3].toString());
      obj['endTime'] = web3Data.toDecimal(res[4].toString());
      obj['leader'] = checkAddress(res[5]);
      obj['lastPrice'] = web3Data.toDecimal(web3Data.fromWei(res[6].toString()));
      obj['buyPrice'] = web3Data.toDecimal(web3Data.fromWei(res[7].toString()));
      callback(err, obj);
    });
  };

  /**
   * return round info by id
   * @param {number} id
   * @param {function} callback
   */
  api.getRoundInfoById = function (id, callback) {
    contractIns.round_m(id, function (err, res) {
      if (err) {
        callback(err, undefined);
        return;
      }
      var obj = {};
      obj['eth'] = web3Data.toDecimal(web3Data.fromWei(res[0].toString()));
      obj['keys'] = web3Data.toDecimal(web3Data.fromWei(res[1].toString()));
      obj['startTime'] = web3Data.toDecimal(res[2].toString());
      obj['endTime'] = web3Data.toDecimal(res[3].toString());
      obj['leader'] = checkAddress(res[4]);
      obj['lastPrice'] = web3Data.toDecimal(web3Data.fromWei(res[5].toString()));
      obj['award'] = res[6];
      callback(err, obj);
    });
  };

  /**
   * return player round info
   * @param {number} id
   * @param {string} address
   * @param {function} callback
   */
  api.getPlayerRoundInfo = function (id, address, callback) {
    contractIns.playerRound_m(id, address, function (err, res) {
      if (err) {
        callback(err, undefined);
        return;
      }
      var obj = {};
      obj['eth'] = web3Data.toDecimal(web3Data.fromWei(res[0].toString()));
      obj['keys'] = web3Data.toDecimal(web3Data.fromWei(res[1].toString()));
      obj['withdraw'] = web3Data.toDecimal(web3Data.fromWei(res[2].toString()));
      callback(err, obj);
    });
  };

  /**
   * create withdraw hex by id
   * @param {number} id
   */
  api.createHexWithdraw = function (id) {
    var funchash = '0x528ce7de';
    return funchash + web3Data.padLeft(web3Data.toHex(id).substr(2), 64);
  };

  /**
   * create award hex by id
   * @param {number} id
   */
  api.createHexAward = function (id) {
    var funchash = '0x80ec35ff';
    return funchash + web3Data.padLeft(web3Data.toHex(id).substr(2), 64);
  };

  /**
   * send ether to contract by web wallet
   * @param {number} eth
   * @param {function} callback
   */
  api.sendEtherByWebWallet = function (eth, callback) {
    if (!this.checkWebWallet() || !defaultAccount) {
      callback(new Error('no web wallet'));
      return;
    }
    web3Wallet.eth.sendTransaction({
      from: defaultAccount,
      to: address,
      value: web3Data.toWei(eth),
      gas: 1000000,
      gasPrice: defaultGasPrice
    }, function (err, res) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, res);
    });
  };

  /**
   * do withdraw by web wallet
   * @param {number} id
   * @param {function} callback
   */
  api.doWithdrawByWebWallet = function (id, callback) {
    var data = this.createHexWithdraw(id);
    if (!this.checkWebWallet() || !defaultAccount) {
      callback(new Error('no web wallet'));
      return;
    }
    web3Wallet.eth.sendTransaction({
      from: defaultAccount,
      to: address,
      gas: 500000,
      gasPrice: defaultGasPrice,
      data: data
    }, function (err, res) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, res);
    });
  };

  /**
   * do award by web wallet
   * @param {number} id
   * @param {function} callback
   */
  api.doAwardByWebWallet = function (id, callback) {
    var data = this.createHexAward(id);
    if (!this.checkWebWallet() || !defaultAccount) {
      callback(new Error('no web wallet'));
      return;
    }
    web3Wallet.eth.sendTransaction({
      from: defaultAccount,
      to: address,
      gas: 500000,
      gasPrice: defaultGasPrice,
      data: data
    }, function (err, res) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, res);
    });
  };

  /**
   * calculate eth by keys
   * @param {number} currentKeys
   * @param {number} addKeys
   */
  api.calEthByKeys = function (currentKeys, addKeys) {
    var currentEth = 0.00000000015625 * (currentKeys + currentKeys * currentKeys) / 2 + currentKeys * 0.000074999921875;
    var newKeys = currentKeys + addKeys;
    var newEth = 0.00000000015625 * (newKeys + newKeys * newKeys) / 2 + newKeys * 0.000074999921875;
    return newEth - currentEth;
  };

  function checkAddress(address) {
    if (address == '0x0000000000000000000000000000000000000000') {
      return null;
    } else {
      return address;
    }
  }

  // export api
  window.api = api;
})();