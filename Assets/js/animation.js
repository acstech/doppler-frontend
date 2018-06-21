'use strict'
$(document).ready(function(){
  var button = '.menu-toggle';
  var open = false;
  // add event listener onn the menu button to open and close the menu tab
    $(button).click(function(){
      if (!open) {
        $(button).css({
         '-moz-transform':'rotate(90deg)',
         '-webkit-transform':'rotate(90deg)',
         '-o-transform':'rotate(90deg)',
         '-ms-transform':'rotate(90deg)',
         'transform':'rotate(90deg)'
        });
      } else {
        $(button).css({
           '-moz-transform':'rotate(0deg)',
           '-webkit-transform':'rotate(0deg)',
           '-o-transform':'rotate(0deg)',
           '-ms-transform':'rotate(0deg)',
           'transform':'rotate(0deg)'
        });
      }
    open = !open;
  });
});
