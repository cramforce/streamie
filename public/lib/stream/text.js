/*
 * i18n module.
 */
var Streamie_Default_Locale = "de";
require.def("stream/text",
  ["text!../i18n/" + Streamie_Default_Locale + ".json"],
  function(defaultData) {
    
    var Data = {};
    var Record = !!location.href.match(/\#record/);
    var CurrentLocale = Streamie_Default_Locale;
    
    function processLocaleFile(locale, data) {
      Data[locale] = JSON.parse(data).text;
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
      
      get: function(group, text, data) {
        if(!Data[CurrentLocale]) Data[CurrentLocale] = {};
        var grp = Data[CurrentLocale][group];
        
        if(!grp) {
          console.log('Missing group ' + group);
          grp = Data[CurrentLocale][group] = {};
        }
        var trans = grp[text];
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