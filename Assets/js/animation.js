window.onload=function() {
  (function(document){
    var div = document.getElementById('menu-button');
    var icon = document.getElementById('menu-toggle');
    var open = false;

    div.addEventListener('click', function(){
      if(open){
        div.className = 'menu-button';
      } else{
        div.className = 'menu-button.open';
      }

      open = !open;
    });
  })(document);
}
