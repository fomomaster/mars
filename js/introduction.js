$(function() {

  if (window.localStorage) {
    var keys = window.localStorage.getItem('keys');
    if (keys < 10000000) {
      $('.launch-stage').hide();
      $('.filling-stage').show();
    } else {
      $('.filling-stage').hide();
      $('.launch-stage').show();
    }
  }

})