#!/bin/bash

# Delete all zip files except the latest one
ls -t *.zip | tail -n +2 | xargs rm
rm -r -d */
rm -rf index.html
unzip *.zip
mv *.html index.html
html_file=index.html
ga_tag="<script async src="https://www.googletagmanager.com/gtag/js?id=G-7Q2WC782QM"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-7Q2WC782QM');
</script>"

# ed -s "$html_file" <<EOF
# /<body>/i
# $ga_tag
# .
# w
# q
# EOF

