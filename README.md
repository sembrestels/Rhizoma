Rhizoma is an Elgg social networking engine (elgg.org) clone written in
Javascript (node.js).


Generate documentation
=====
<pre>
apt-get install ruby rubygems
gem install jsduck
jsduck engine/classes --output reference
</pre>

Testing
=====
<pre>
npm -g install vows
vows --spec engine/tests/*
</pre>

License
======
Lorea Rhizoma
Copyright (C) 2013  Lorea Developers

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see [http://www.gnu.org/licenses/].
