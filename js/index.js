$(function () {
  $('[data-toggle="popover"]').popover();
  //retain the maximum number of decimals
  var maxDecimals = 4;
  //initialize BigNumber
  var BigNumber = new Web3().BigNumber;
  //MetaMask monitoring
  var maskAccount = '';
  api.addAccountListener(function (account) {
    maskAccount = account;
  })
  //synchronize server time
  var jetLag;
  api.getTime(function (err, res) {
    if (err) {
      return;
    }
    jetLag = res - new Date().getTime();
  });

  //cache current round information
  var currentRound;
  roundInfo('first');

  function roundInfo(first) {
    if (first == 'first') {
      $('.loading').show();
    }
    api.getCurrentRoundInfo(function (err, res) {
      if (err) {
        return;
      }
      $('.loading').hide();
      var currentTime = new Date().getTime() / 1000;
      if (!!jetLag) {
        currentTime = (new Date().getTime() + jetLag) / 1000;
      }

      if (currentTime > res.endTime) {
        $('.launch-stage').hide();
        $('.filling-stage').show();
        $('.rocket').html('#' + (res.rndNo + 1));
        $('.reward-total').html('0 ETH');
        $('.total-investment').html('0 ETH');
        $('.countdown .card-title').html('12:00:00');
        $('.leader').html($.t('dynamic.waitingInvestor'));
        $('.unit-price').html('0.000075 ETH');
        $('.filling-progress .card-text').html('0/10,000,000 Kg');
        $('#pills-buy .total-price').html('= ' + (api.calEthByKeys(0, parseFloat($('#pills-buy .total-fuel').val()))).toFixed(8) + ' ETH');
        $('#pills-buy .total-price').data('total', (api.calEthByKeys(0, parseFloat($('#pills-buy .total-fuel').val()))).toFixed(8));
      } else {
        //determine whether to reset the countdown
        if (!!currentRound && res.endTime !== currentRound.endTime) {
          createTimer(res.endTime);
        }
        if (res.keys < 10000000) {
          $('.launch-stage').hide();
          $('.filling-stage').show();
          var percentage = (res.keys / 100000).toFixed(0);
          $('.unit-price').html(
            new BigNumber(
              new BigNumber(
                (res.buyPrice).toString()
              ).toFixed(8)
            ).toFormat() + ' ETH'
          )
          $('#pills-buy .total-price').html('= ' + api.calEthByKeys(res.keys, parseFloat($('#pills-buy .total-fuel').val())).toFixed(8) + ' ETH');
          $('#pills-buy .total-price').data('total', api.calEthByKeys(res.keys, parseFloat($('#pills-buy .total-fuel').val())).toFixed(8));
          $('.filling-progress .progress-bar').html(percentage + '%');
          $('.filling-progress .progress-bar').attr('aria-valuenow', percentage);
          $('.filling-progress .card-text').html(
            new BigNumber(
              res.keys.toFixed(0)
            ).toFormat() + '/10,000,000 Kg'
          );
          $('.filling-progress .progress-bar').attr('style', 'width:' + percentage + '%');
        } else {
          $('.filling-stage').hide();
          $('.launch-stage').show();
          if (res.lastPrice > 0) {
            $('.bid-price').html(
              new BigNumber(
                new BigNumber(
                  (res.lastPrice).toString()
                ).toFixed(maxDecimals)
              ).toFormat() + ' ETH'
            );
            $('.bid-range').html(
              (new BigNumber(
                new BigNumber(
                  (res.lastPrice + 0.1).toString()
                ).toFixed(maxDecimals)
              ).toFormat()) +
              ' ~ ' +
              (new BigNumber(
                new BigNumber(
                  (res.lastPrice + 10).toString()
                ).toFixed(maxDecimals)
              ).toFormat()) + ' ETH'
            );
          } else {
            $('.bid-price').html('-- ETH')
            $('.bid-range').html('0.1 ~ 10 ETH');
          }
        }
        $('.rocket').html('#' + res.rndNo);
        $('.reward-total').html(
          new BigNumber(
            new BigNumber(
              (res.eth * 0.35).toString()
            ).toFixed(maxDecimals)
          ).toFormat() + ' ETH'
        );
        $('.total-investment').html(
          new BigNumber(
            new BigNumber(
              res.eth.toString()
            ).toFixed(maxDecimals)
          ).toFormat() + ' ETH'
        );
        $('.leader').html(res.leader);
      }
      currentRound = res;
    });
  }

  //earnings
  (function () {
    var address = '';
    var round = '';
    $('body').on('click', '#pills-dividend-tab', function () {
      if (!!$('.dividend-address').val()) {
        return;
      }
      round = currentRound.rndNo;
      $('.dividend-search .rocket-num').val(round);
      if (!!maskAccount) {
        $('.dividend-address').val(maskAccount);
        dividendSearch(round, maskAccount);
      }
    });
    $('body').on('click', '.dividend-submit', function () {
      round = $('.dividend-search .rocket-num').val();
      address = $.trim($('.dividend-address').val());
      dividendSearch(round, address);
    });
    $('body').on('click', '.dividend-my', function () {
      round = $('.dividend-search .rocket-num').val();
      $('.dividend-address').val(maskAccount);
      dividendSearch(round, maskAccount);
    });
    //earnings withdraw
    $('body').on('click', '.dividend-withdrawal', function () {
      round = $(this).data('round');
      address = $.trim($('.dividend-address').val());
      if (!!maskAccount && address != maskAccount) {
        $('#alertModal .alert-text').html($.t('dynamic.withdrawaPrompt'));
        $('#alertModal').modal('show');
        $('body').on('click', '.btn-determine', function () {
          api.doWithdrawByWebWallet(round, function (err, res) {
            if (err) {
              if (err == 'Error: no web wallet') {
                $('#alertModal .alert-text').html($.t('dynamic.noMetaMask'));
                $('#alertModal').modal('show');
              }
              return;
            }
          });
        });
      } else if (!!maskAccount) {
        api.doWithdrawByWebWallet(round, function (err, res) {
          if (err) {
            if (err == 'Error: no web wallet') {
              $('#alertModal .alert-text').html($.t('dynamic.noMetaMask'));
              $('#alertModal').modal('show');
            }
            return;
          }
        });
      } else {
        $('#alertModal .alert-text').html($.t('dynamic.noMetaMask'));
        $('#alertModal').modal('show');
      }
    })

    function dividendSearch(round, address) {
      if (!!address) {
        if (!/^0x[0-9a-fA-F]{40}$/.test($.trim(address))) {
          tip($.t('dynamic.correctAddress'));
          return;
        }

        $('#pills-dividend .warning-modal .warning-text').html($.t('dynamic.loading'));
        $('#pills-dividend .dividend-result').hide();
        $('#pills-dividend .warning-modal').show();

        api.getPlayerRoundInfo(round, address, function (err, res) {
          if (err) {
            return;
          }
          var totalDividend = ((res.keys / currentRound.keys) * (currentRound.eth * 0.6)).toFixed(maxDecimals);
          var pendingWithdraw = (totalDividend - res.withdraw).toFixed(maxDecimals);
          $('.dividend-result .round').html('#' + round);
          $('.dividend-result .investment').html(new BigNumber((res.eth).toFixed(maxDecimals)).toFormat() + ' ETH');
          $('.dividend-result .fuel-holding').html(new BigNumber((res.keys).toFixed(2)).toFormat() + ' Kg');
          $('.dividend-result .dividend-details').html(new BigNumber(pendingWithdraw).toFormat() + ' / ' + new BigNumber(totalDividend).toFormat() + ' ETH');
          $('.dividend-result .dividend-withdrawal').data('round', round);
          $('.dividend-result .dividend-copy').attr('data-clipboard-text', api.createHexWithdraw(round));
          $('#pills-dividend .warning-modal').hide();
          $('#pills-dividend .dividend-result').show();
        });
        if (address != maskAccount && !!maskAccount) {
          $('.dividend-my').show();
        } else {
          $('.dividend-my').hide();
        }
      }
    }


  })();

  //Pot
  (function () {
    var round;
    $('body').on('click', '#pills-award-tab', function () {
      round = currentRound.rndNo;
      $('.award-search .rocket-num').val(round);
      awardSearch(round);
    });

    $('body').on('change', '.award-search .rocket-num', function () {
      round = $('.award-search .rocket-num').val();
      awardSearch(round);
    });

    //Pot withdraw
    $('body').on('click', '.award-result .award-withdrawal', function () {
      var address = $('.award-result .winner').data('address');
      if (!!address) {
        if (!!maskAccount && address != maskAccount) {
          $('#alertModal .alert-text').html($.t('dynamic.incompatible'));
          $('#alertModal').modal('show');
        } else if (!!maskAccount && address == maskAccount) {
          api.doAwardByWebWallet(round, function (err, res) {
            if (err) {
              if (err == 'Error: no web wallet') {
                $('#alertModal .alert-text').html($.t('dynamic.noMetaMask'));
                $('#alertModal').modal('show');
              }
              return;
            }
          });
        } else {
          $('#alertModal .alert-text').html($.t('dynamic.noMetaMask'));
          $('#alertModal').modal('show');
        }
      } else {
        $('#alertModal .alert-text').html($.t('dynamic.unopened'));
        $('#alertModal').modal('show');
      }

    });

    function awardSearch(round) {
      $('#pills-award .warning-modal').show();
      $('#pills-award .award-result').hide();
      if (!!round) {
        api.getRoundInfoById(round, function (err, res) {
          if (err) {
            return;
          }
          var currentTime = new Date().getTime() / 1000;
          if (!!jetLag) {
            currentTime = (new Date().getTime() + jetLag) / 1000;
          }
          if (currentTime > res.endTime) {
            $('.award-result .winner').html(res.leader);
            $('.award-result .winner').data('address', res.leader);
          } else {
            $('.award-result .winner').html($.t('index.gameOn'));
          }
          if (res.award) {
            $('.award-result .withdraw').html('<span class="text-success">' + $.t('index.alreadyWithdraw') + '</span>');
          } else {
            $('.award-result .withdraw').html('<span class="text-danger">' + $.t('index.undrawn') + '</span>');
          }
          $('.award-result .award').html(new BigNumber((res.eth * 0.35).toFixed(maxDecimals)).toFormat() + ' ETH');
          $('.award-result .round').html('#' + round);
          $('.award-result .award-copy').attr('data-clipboard-text', api.createHexAward(round));

          $('#pills-award .warning-modal').hide();
          $('#pills-award .award-result').show();
        });
      }
    }

  })();

  //buy fuel && bidding
  (function () {
    $('body').on('input', '.total-fuel', function () {
      var total = 0;
      var totalFuel = Number($('.total-fuel').val());
      var currentKey = currentRound.keys;
      total = api.calEthByKeys(currentRound.keys, totalFuel)
      $('#pills-buy .total-price').html('= ' + total.toFixed(8) + ' ETH');
      $('#pills-buy .total-price').data('total', total.toFixed(8));
    })

    $('body').on('click', '.submit-order', function () {
      var step = $(this).data('step');
      var total = 0;

      if (step == 'filling') {
        total = $('#pills-buy .total-price').data('total');
      }

      if (step == 'launch') {
        total = $('.total-bid').val();
        if (total < currentRound.lastPrice + 0.1) {
          $('#alertModal .alert-text').html($.t('dynamic.lower') + (currentRound.lastPrice + 0.1) + ' ETH');
          $('#alertModal').modal('show');
          return;
        }
      }
      api.sendEtherByWebWallet(total, function (err, res) {
        if (err) {
          if (err == 'Error: no web wallet') {
            $('#alertModal .alert-text').html($.t('dynamic.noMetaMask'));
            $('#alertModal').modal('show');
          }
          return;
        }
        $('#alertModal .alert-text').html($.t('dynamic.transferHash') + '<a target="_blank" style="word-break: break-all;" href="https://etherscan.io/tx/' + res + '">' + res + '</a>');
        $('#alertModal').modal('show');
      });
    })
  })();

  //Determine if currentRound has data
  var roundTimer = null;
  roundTimer = setInterval(function () {
    if (!!currentRound) {
      clearInterval(roundTimer);
      var selectStr = '';
      for (var i = 1; i < currentRound.rndNo + 1; i++) {
        selectStr += '<option value="' + i + '">' + $.t("index.rocket") + ' #' + i + '</option>'
      }
      $('.rocket-num').html(selectStr);
      $('.rocket-num').i18n();
      //start counting down
      createTimer(currentRound.endTime);
      //start polling
      setInterval(roundInfo, 10000);
      if (window.localStorage) {
        window.localStorage.setItem('keys', currentRound.keys);
      }
    }
  }, 100);

  var clipboard = new ClipboardJS('.copy');
  clipboard.on('success', function (e) {
    tip($.t('dynamic.copied'));
  });

  var timerLoop = null;

  function createTimer(endTime) {
    clearInterval(timerLoop);
    var _currentTime = ((new Date().getTime() + jetLag) / 1000).toFixed(0);
    if (_currentTime > endTime) {
      return;
    }
    $('.countdown .card-title').text(countDown(endTime - _currentTime));
    timerLoop = setInterval(function () {
      var _currentTime = ((new Date().getTime() + jetLag) / 1000).toFixed(0);
      $('.countdown .card-title').text(countDown(endTime - _currentTime));
    }, 1000);
  }

  function countDown(times) {
    var day = 0,
      hour = 0,
      minute = 0,
      second = 0,
      str;
    if (times > 0) {
      day = Math.floor(times / (60 * 60 * 24));
      hour = Math.floor(times / (60 * 60)) - (day * 24);
      minute = Math.floor(times / 60) - (day * 24 * 60) - (hour * 60);
      second = Math.floor(times) - (day * 24 * 60 * 60) - (hour * 60 * 60) - (minute * 60);
    }
    if (day <= 9) day = '0' + day;
    if (hour <= 9) hour = '0' + hour;
    if (minute <= 9) minute = '0' + minute;
    if (second <= 9) second = '0' + second;
    str = hour + ":" + minute + ":" + second;
    return str;
  }

  function tip(text) {
    $('#tipModal .tip-text').html(text);
    $('#tipModal').modal('show');
    setTimeout(function () {
      $('#tipModal').modal('hide');
    }, 2000);
  }
})