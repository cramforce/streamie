/*
 * i18n module.
 */
(function() {
  var Streamie_Default_Locale = "en";
  
  var KnownLocales = {
    ar: true,
    de: true,
    fr: true,
    lv: true,
    nl: true,
    pt: true,
    ru: true,
    bg: true
  };
  
  var getLangFromPara = function() {
    var search = location.search || "";
    var match = search.match(/hl=(\w+)/);
    if(match) {
      var lang = match[1];
      if(KnownLocales[lang]) {
        return lang;
      }
    }
    return Streamie_Default_Locale;
  };
  
  var CurrentLocale = getLangFromPara();

  require.def("stream/text",
    ["text!../i18n/" + CurrentLocale + ".json"],
    function(defaultData) {
      
      if(CurrentLocale != Streamie_Default_Locale) {
        $('a.inject-hl').each(function() {
          this.href = this.href += "?hl="+encodeURIComponent(CurrentLocale);
        });
      }
      
      var Data = {};
      var Record = !!location.href.match(/\#record/);
    
      function processLocaleFile(locale, data) {
        try {
          Data[locale] = JSON.parse(data).text;
        } catch(e) {
          alert('Error loading locale ' + CurrentLocale + ': ' + e);
        }
      }
    
      processLocaleFile(CurrentLocale, defaultData);
    
      var dump = function() {
        var data = {
          locale: CurrentLocale,
          text: Data[CurrentLocale]
        }
        var id = "i18ndump";
        var area = document.getElementById(id);
        if(!area) {
          var area = document.createElement('textarea');
        
          area.id = id;
          $("body").append(area);
        }
        area.value = JSON.stringify(data, null, '  ');
      };
    
      return {
        setLocale: function(locid, cb) {
          CurrentLocale = locid;
          if(!Data[locid]) {
            this.load(locid, cb);
          }
        },
      
        load: function(locale, cb) {
          $.get('/i18n/' + encodeURIComponent(locale) + '.properties', function(data) {
            processPropertiesFile(locale, data);
          });
        },
      
        // Does some hacky i18n of the HTML page
        replaceInPage: function() {
          var module = this;
          var tags = $('.i18n');
          var attrs = ['title', 'placeholder'];
          tags.each(function() {
            var t = $(this)
            if(this.innerHTML) {
              this.innerHTML = module.get('page', this.innerHTML);
            }
          
            attrs.forEach(function(name) {
              var cur = t.attr(name);
              if(cur) {
                t.attr(name, module.get('page', cur));
              }
            });
          })
        },
      
        get: function(group, text, data) {
          if(!Data[CurrentLocale]) Data[CurrentLocale] = {};
          var trans = text;
          if(CurrentLocale != Streamie_Default_Locale) {
            var grp = Data[CurrentLocale][group];
        
            if(!grp) {
              console.log('Missing group ' + group);
              grp = Data[CurrentLocale][group] = {};
            }
            trans = grp[text];
          }
          if(trans == null) {
             console.log('Missing text ' + text + ' in locale ' + CurrentLocale);
             if(Record) {
               var val = prompt('Enter text in '+CurrentLocale+': ' + text);
               if(val != null) {
                 trans = grp[text] = val;
                 dump()
               }
             } else {
               return '<<' + text;
            }
          }
          if(data) {
            trans = trans.replace(/{(\w+)}/, function(all, key) {
              var val = data[key];
              if(val == null) return all;
              return val;
            })
          }
          return trans;
        }
      };
    }
  );
})();