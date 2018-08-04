function onlyLetterNumber(obj) {
  obj.value = obj.value.replace(/[^\a-\z\A-\Z0-9]/g, '');
}
$(function() {
  i18n.init({
    resGetPath: 'locales/__lng__/__ns__.json',
    lng: 'en'
  }, function(t) {
    $('body').i18n();
  });

  $('body').on('click', '.dropdown-menu a', function() {
    i18n.init({
      resGetPath: 'locales/__lng__/__ns__.json',
      lng: $(this).data('lan')
    }, function(t) {
      $('body').i18n();
      $('#navbarDropdown').html($.t("lan"));
    });
  });
})