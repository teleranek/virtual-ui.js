(function (_) {
    // -----------------------------------------------------------------------------------------------------------------
    // TreeNode Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * Base tree node
     * @class TreeNode
     * @constructor
     */
    function TreeNode() {
    }

    /**
     * TreeNode properties changes, triggering vtree repainting
     * @enum
     * @private
     */
    TreeNode._Change = {
        ExpandedSet: 1,
        ExpandedRemoved: 2
    };

    /**
     * Link to parent node of the current TreeNode. For _root node the parent may be of any type
     * @type {TreeNode|*}
     */
    TreeNode.prototype.parent = null;

    /**
     * Link to the previous node of the current TreeNode
     * @type {TreeNode}
     */
    TreeNode.prototype.previous = null;

    /**
     * Link to the next node of the current TreeNode
     * @type {TreeNode}
     */
    TreeNode.prototype.next = null;

    /**
     * Link to the first child of the current TreeNode
     * @type {TreeNode}
     */
    TreeNode.prototype.firstChild = null;

    /**
     * Link to the last child of the current TreeNode
     * @type {TreeNode}
     */
    TreeNode.prototype.lastChild = null;

    /**
     * Indicates if the current TreeNode should be painted expanded
     * @type {Boolean}
     */
    TreeNode.prototype.expanded = false;

    /**
     * Accept a visitor on this TreeNode's children
     * @param {Function} visitor
     * @param {Boolean} visibleOnly - indicates if only the painted children should be visited
     * @param {Boolean} reverse - walk through children in reverse order
     * @param {Boolean} any - if true, all the children will be processed,
     * and if the result of one child is true, the overall result will be true;
     * if false, children will be processed until the first false result, and if false occurs in some child result,
     * the false is returned immediately as function call result
     * @return {Boolean}
     */
    TreeNode.prototype.acceptChildren = function (visitor, visibleOnly, reverse, any) {
        var res = !any;
        if (!visibleOnly || this.expanded) {
            var childRes;
            if (reverse) {
                for (var child = this.lastChild; child != null; child = child.previous) {
                    childRes = child.accept(visitor, visibleOnly, reverse, any);
                    if (childRes === false && !any) {
                        return false;
                    } else if (childRes === true && any) {
                        res = true;
                    }
                }
            } else {
                for (var child = this.firstChild; child != null; child = child.next) {
                    childRes = child.accept(visitor, visibleOnly, reverse, any);
                    if (childRes === false && !any) {
                        return false;
                    } else if (childRes === true && any) {
                        res = true;
                    }
                }
            }
        }
        return res;
    };

    /**
     * Accept a visitor
     * @param {Function} visitor a visitor function called for each visit retrieving the current
     * node as first parameter. The function may return a boolean value indicating whether to
     * return visiting (true) or whether to cancel visiting (false). Not returning anything or
     * returning anything else than a Boolean will be ignored.
     * @param {Boolean} visibleOnly  - indicates if only the painted tree nodes should be visited
     * @param {Boolean} reverse - walk through children in reverse order
     * @param {Boolean} any - if true, all the children will be processed,
     * and if the result of one child is true, the overall result will be true
     * @return {Boolean} result of visiting (false = canceled, true = went through)
     */
    TreeNode.prototype.accept = function (visitor, visibleOnly, reverse, any) {
        if (visitor.call(null, this) === false) {
            return false;
        }

        return this.acceptChildren(visitor, visibleOnly, reverse, any);
    };

    /**
     * Calculates and return the node nest level starting from the _root node deep into the tree by the current node.
     * For _root node returns 0.
     * @returns {Number} the node nest level
     */
    TreeNode.prototype.getNestLevel = function () {
        var level = 0;
        for (var parent = this.parent; parent != null && (parent instanceof TreeNode); parent = parent.parent) {
            ++level;
        }
        return level;
    };

    /**
     * Handle in the current node the change occurred in the passed node
     * @param {TreeNode._Change} change - the change to handle
     * @param {TreeNode} node - the changed node
     */
    TreeNode.prototype.handleChange = function (change, node) {
        if (change == TreeNode._Change.ExpandedSet || change == TreeNode._Change.ExpandedRemoved) {
            if (this.parent) {
                this.parent.handleChange(change, node);
            }
        }
    };

    /**
     * Handler function when 'expand' element is clicked to expand or collapse the node children visibility
     * @param {Event} e - click event to handle
     */
    TreeNode.prototype.handleExpand = function (e) {
        if (e.target.id === VTree.COLLAPSE_ID && this.expanded) {
            this.expanded = false;
            this.handleChange(TreeNode._Change.ExpandedSet, this);
        } else if (e.target.id === VTree.EXPAND_ID && !this.expanded) {
            this.expanded = true;
            this.handleChange(TreeNode._Change.ExpandedRemoved, this);
        }
    };

    /**
     * Calculates and returns the number of nodes in the current node sub-tree.
     * If the current node doesn't have children, 1 is returned.
     * @returns {Number} the number of nodes in the current node sub-tree
     */
    TreeNode.prototype.getNodeCount = function () {
        var i = 0;
        this.accept(function (node) {
            ++i;
            return true;
        }, false);
        return i;
    };

    TreeNode.prototype.toString = function () {
        return "[TreeNode]";
    };

    function TreeNodeNamed(id) {
        this.id = id;
    }

    TreeNodeNamed.prototype = Object.create(TreeNode.prototype);
    TreeNodeNamed.prototype.id = null;

    // -----------------------------------------------------------------------------------------------------------------
    // VTree Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * Base Virtual Tree Class
     * @param {Element} [container] a HTML container for displaying the tree
     * @param {Function(TreeNode, Element)} [renderer] renderer to fill the tree node visible element with content
     * @param {String} [nodeStyle] a tree node visible element CSS style name. If not passed, the default style name is used.
     * @param {Function(Element)} [expandRenderer] renderer for the 'expand' span element
     * @param {String} [expandStyle] the 'expand' span element CSS style name. If not passed, the default style name is used.
     * @param {Function(Element, Number)} [separatorRenderer] renderer for the separator line between rows
     * for marking a place for inserting dragged row.
     * Accepts separator HTML element and the tree deep level for inserted element
     * @param {Number} [freeHeight] the height of the zone at the bottom or at the top of each tree row
     * to be interpreted for inserting a dragged row below or above the current row.
     * @param {String} [insertIntoStyle] a CSS style name to be added to a row into which anoither row is being dragged.
     * If not passed, the default style name is used.
     * @param {Function(TreeNode, TreeNode, TreeNode, TreeNode)} [dropAllowedCallback] callback being used to check if
     * dropping of a dragged row is allowed to the specific place. Accepts perent node (to drop inside), next node,
     * previous node, and dragged node. Next and previous node may be null.
     * @param {Function(TreeNode, TreeNode, TreeNode, TreeNode)} [dropCallback] callback being used when
     * dropping of a dragged row into the specific place. Accepts perent node (to drop inside), next node,
     * previous node, and dragged node. Next and previous node may be null.
     * @param {Function(TreeNode)} [clickCallback] callback being used when row is clicked
     * @param {String} [upSeparatorSpan1Style] a style name of the left part of upper row separator to indicate drop place
     * @param {String} [upSeparatorSpan2Style] a style name of the right part of upper row separator to indicate drop place
     * @param {String} [downSeparatorSpan1Style] a style name of the left part of lower row separator to indicate drop place
     * @param {String} [downSeparatorSpan2Style] a style name of the right part of lower row separator to indicate drop place
     * @param {Boolean} [putLastChildWhenInside] If true, when a node is dropped into another node,
     * put the dropped node as the last child of the parent node, otherwise (false or null) put as the first child.
     * @class VTree
     * @constructor
     */
    function VTree(container, renderer, nodeStyle, expandRenderer, expandStyle,
                   separatorRenderer, freeHeight, insertIntoStyle,
                   dropAllowedCallback, dropCallback, clickCallback,
                   upSeparatorSpan1Style, upSeparatorSpan2Style, downSeparatorSpan1Style, downSeparatorSpan2Style,
                   putLastChildWhenInside) {
        // Note: initialization order is important here
        this._root = new TreeNode();
        this._root.expanded = true;
        this._root.parent = this;

        VList.call(this, container, renderer, 0, 0);

        this._container.classList.add('vtree');

        this._rowStyle = nodeStyle ? nodeStyle : VTree.DEFAULT_ROW_STYLE;
        this._freeHeight = freeHeight ? freeHeight : VTree.DEFAULT_FREEZONE_HEIGHT;
        this._insertIntoStyle = insertIntoStyle ? insertIntoStyle : VTree.DEFAULT_INSERTINTO_STYLE;
        this._upSeparatorSpan1Style = upSeparatorSpan1Style ? upSeparatorSpan1Style : VTree.DEFAULT_UP_SEPARATOR_SPAN1_STYLE;
        this._downSeparatorSpan1Style = downSeparatorSpan1Style ? downSeparatorSpan1Style : VTree.DEFAULT_DOWN_SEPARATOR_SPAN1_STYLE;

        this._initComputedVals();

        if (expandStyle) {
            this._expandStyle = expandStyle;
        }

        if (expandRenderer) {
            this._expandRenderer = expandRenderer;
        }

        if (separatorRenderer) {
            this._separatorRenderer = separatorRenderer;
        }

        if (upSeparatorSpan2Style) {
            this._upSeparatorSpan2Style = upSeparatorSpan2Style;
        }

        if (downSeparatorSpan2Style) {
            this._downSeparatorSpan2Style = downSeparatorSpan2Style;
        }

        if (dropAllowedCallback) {
            this._dropAllowedCallback = dropAllowedCallback;
        }

        if (dropCallback) {
            this._dropCallback = dropCallback;
        }

        if (clickCallback) {
            this._clickCallback = clickCallback;
        }

        this._putLastChildWhenInside = !!putLastChildWhenInside;

        this._aScroll = new AutoScroll(this._container, 200, 10, null, 7);
    }

    /**
     * The default tree node visible div element style name
     * @type {String}
     */
    VTree.DEFAULT_ROW_STYLE = 'vrow';

    /**
     * The default 'insert into the current node' tree node visible div element style name
     * @type {String}
     */
    VTree.DEFAULT_INSERTINTO_STYLE = 'insertInto';

    /**
     * The default one-level padding length in 'px' for tree node visible div element
     * @type {Number}
     */
    VTree.DEFAULT_PADDING = 50;

    /**
     * The default tree node visible div element height in 'px'
     * @type {Number}
     */
    VTree.DEFAULT_LINE_HEIGHT = 30;

    /**
     * The default height in 'px' of the zone at the top and bottom of each tree node visible div element
     * for indicating that new node insertion is possible above or below the current node
     * @type {Number}
     */
    VTree.DEFAULT_FREEZONE_HEIGHT = 7;

    /**
     * The default 'insert above the current node' div element style name
     * @type {String}
     */
    VTree.DEFAULT_UP_SEPARATOR_SPAN1_STYLE = 'up-separator-span1';

    /**
     * The default 'insert below the current node' div element style name
     * @type {String}
     */
    VTree.DEFAULT_DOWN_SEPARATOR_SPAN1_STYLE = 'down-separator-span1';

    /**
     * The collapse visible children of the current node snap element identifier
     * @type {String}
     */
    VTree.COLLAPSE_ID = "clpsId";

    /**
     * The expand visible children of the current node snap element identifier
     * @type {String}
     */
    VTree.EXPAND_ID = "xpndId";

    /**
     * The current node visible div element identifier
     * @type {String}
     */
    VTree.ROW_ID = "rowId";

    /**
     * The default 'insert below the current node' div element identifier
     * @type {String}
     */
    VTree.LOWER_SEP_ID = "lsepId";

    /**
     * The default 'insert above the current node' div element identifier
     * @type {String}
     */
    VTree.UPPER_SEP_ID = "usepId";

    VTree.prototype = Object.create(VList.prototype);

    // -----------------------------------------------------------------------------------------------------------------
    // VTree.IdxIterator auxiliary Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * A forward iterator to walk through vtree nodes from the first index till the last index included
     * @param {VTree} vtree - virtual tree reference to walk through
     * @param {Number} firstIdx - the index of the walk start node; if not provided, 1 (top level first node) is used
     * @param {Number} lastIdx - the index of the walk last node;
     * if not provided, the index of the tree bottom right node is used
     * @param {Boolean} visibleOnly - indicates if only the painted nodes should be iterated
     * @constructor
     */
    VTree.IdxIterator = function (vtree, firstIdx, lastIdx, visibleOnly) {
        this._vtree = vtree;
        this._firstIdx = firstIdx ? firstIdx : 1;
        if (visibleOnly) {
            this._lastIdx = lastIdx && lastIdx <= this._vtree._rowCount ? lastIdx : this._vtree._rowCount;
        } else {
            this._lastIdx = lastIdx && lastIdx <= this._vtree._nodeCount ? lastIdx : this._vtree._nodeCount;
        }
        this._visibleOnly = !!visibleOnly;
    };

    VTree.IdxIterator.prototype._vtree = null;
    VTree.IdxIterator.prototype._firstIdx = 0;
    VTree.IdxIterator.prototype._lastIdx = 0;
    VTree.IdxIterator.prototype._visibleOnly = false;
    VTree.IdxIterator.prototype._curNode = null;
    VTree.IdxIterator.prototype._curIdx = 0;

    VTree.IdxIterator.prototype.getFirstNode = function () {
        if (this._firstIdx <= this._lastIdx) {
            this._curIdx = this._firstIdx;
            this._curNode = this._vtree._getNodeByIdx(this._curIdx, this._visibleOnly);
        } else {
            this._curIdx = this._lastIdx + 1;
            this._curNode = null;
        }
        return this._curNode;
    };

    VTree.IdxIterator.prototype.getNext = function () {
        if (!this._curIdx) {
            return this.getFirstNode();
        }

        this._curIdx = this._curIdx <= this._lastIdx ? this._curIdx + 1 : this._curIdx;

        if (this._curIdx <= this._lastIdx && this._curNode) {
            this._curNode = this._vtree.getNextNode(this._curNode, this._visibleOnly);
        } else {
            this._curNode = null;
        }
        return this._curNode;
    };

    // -----------------------------------------------------------------------------------------------------------------
    // VTree Class implementation
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * The root node of the tree. Should not contain any data except children list
     * @type {TreeNode}
     * @private
     */
    VTree.prototype._root = null;

    /**
     * The number of nodes in the vtree. Root node is not counted
     * @type {Number}
     * @private
     */
    VTree.prototype._nodeCount = 0;
    VTree.prototype._rowStyle = null;
    VTree.prototype._paddingLeft = 0;
    VTree.prototype._containerWidth = 0;
    VTree.prototype._expandedWidth = 0;
    VTree.prototype._expandStyle = null;
    VTree.prototype._dragNodes = null;
    VTree.prototype._freeHeight = 0;
    VTree.prototype._upSeparatorStyle = null;
    VTree.prototype._downSeparatorStyle = null;
    VTree.prototype._insertIntoStyle = null;
    VTree.prototype._downSepHeight = 0;

    VTree.prototype._dropAllowedCallback = null;
    VTree.prototype._dropCallback = null;
    VTree.prototype._clickCallback = null;

    /**
     * If true, when a node is dropped into another node, put the dropped node as the last child of the parent node,
     * otherwise (false) put as the first child. The default value is false.
     * @type {Boolean}
     * @private
     */
    VTree.prototype._putLastChildWhenInside = false;

    VTree.prototype._invalidationRequestTimerId = null;
    VTree.prototype._focusTimerId = null;

    VTree.prototype._updateMarksTimerId = null;

    /**
     * Maintain reference to AutoScroll functional
     * @type {AutoScroll}
     * @private
     */
    VTree.prototype._aScroll = null;

    /**
     * Contains a reference to a free zone for dropping elements at the bottom of the tree (if visible)
     * @type {Element}
     * @private
     */
    VTree.prototype._freeZone = null;

    /**
     * Contains a reference to the last entered droppable element
     * @type {Element}
     * @private
     */
    VTree.prototype._lastVisitedDroppable = null;

    /** override */
    VTree.prototype.endUpdate = function () {
        if (--this._updateCounter === 0) {
            this.requestInvalidation();
        }
    };

    /** override */
    VTree.prototype.refresh = function () {
        this._initComputedVals();
        this.requestInvalidation(true);
    };

    VTree.prototype.expandAndFocus = function (node) {
        var index = 0;

        var currentNode = node;
        while (currentNode.parent && currentNode.parent !== this._root) {
            currentNode = currentNode.parent;
            currentNode.expanded = true;
        }

        if (this._focusTimerId) {
            return false;
        }

        this._root.acceptChildren(function (n) {
            if (n === node) {
                return false;
            }

            index++;
            return true;
        }, true);
       
        this.invalidate();

        var scrollTop = index * this._rowHeight;
        var currentScrollTop = this._container.scrollTop;
        
        if (currentScrollTop > scrollTop ||
            (scrollTop - currentScrollTop) >= this._rowHeight*this._visibleRows) {

            this._focusTimerId = setTimeout(function () {
                this._container.scrollTop = scrollTop;
                this._focusTimerId = null;
            }.bind(this, 50));
        }

        return true;
    }

    VTree.prototype.requestInvalidation = function (immediate) {
        if (immediate) {
            if (!this._updateCounter) {
                this.invalidate();
            }
        } else {
            if (this._invalidationRequestTimerId !== null) {
                clearTimeout(this._invalidationRequestTimerId);
                this._invalidationRequestTimerId = null;
            }

            this._invalidationRequestTimerId = setTimeout(function () {
                this.requestInvalidation(true);
                this._invalidationRequestTimerId = null;
            }.bind(this), 25);
        }
    };

    VTree.prototype.handleChange = function (change, node) {
        if (change == TreeNode._Change.ExpandedSet || change == TreeNode._Change.ExpandedRemoved) {
            this.requestInvalidation(true);
        }
    };

    VTree.prototype.invalidate = function () {
        this._updateRowCount();
        this._updateVisibleRows();
        this._updateScroller();
        this._requestViewportClean();
        this._render();
        this._lastRenderScrollTop = this._container.scrollTop;
    };

    VTree.prototype.getNextNode = function (node, visibleOnly) {
        var startNode = node;
        var nextNode = null;

        if (visibleOnly) {
            while ((startNode.parent instanceof TreeNode) && !startNode.parent.expanded) {
                // Normally, initial node should be visible and we should not get here
                startNode = startNode.parent;
            }
        }

        if (startNode.firstChild && (!visibleOnly || startNode.expanded)) {
            nextNode = startNode.firstChild;
        }

        if (!nextNode && startNode.next) {
            nextNode = startNode.next;
        }

        if (!nextNode) {
            for (var parentNode = startNode.parent;
                 !nextNode && (parentNode instanceof TreeNode) && parentNode !== this._root;
                 parentNode = parentNode.parent) {

                if (parentNode.next) {
                    nextNode = parentNode.next;
                }
            }
        }

        return nextNode;
    };

    VTree.prototype.appendNode = function (parent, node) {
        return this._insertNodeBefore(parent || this._root, null, node);
    };

    VTree.prototype.prependNode = function (parent, node) {
        return this._insertNodeBefore(parent || this._root, parent ? parent.firstChild : this._root.firstChild, node);
    };

    VTree.prototype.insertNodeBefore = function (reference, node) {
        return this._insertNodeBefore(reference.parent, reference, node);
    };

    VTree.prototype.insertNodeAfter = function (reference, node) {
        return this._insertNodeBefore(reference.parent, reference.next ? reference.next : null, node);
    };

    VTree.prototype.removeNode = function (node) {
        if (node.parent.firstChild == node) {
            node.parent.firstChild = node.next;
        }

        if (node.parent.lastChild == node) {
            node.parent.lastChild = node.previous;
        }

        if (node.previous != null) {
            node.previous.next = node.next;
        }

        if (node.next != null) {
            node.next.previous = node.previous;
        }

        var parent = node.parent;
        node.parent = null;
        node.previous = null;
        node.next = null;

        if (node.firstChild) {
            this._nodeCount -= node.getNodeCount();
        } else {
            --this._nodeCount;
        }
        if (node.expanded && node.firstChild) {
            this._updateRowCount();
        } else if (parent.expanded) {
            --this._rowCount;
        }
        if (parent.expanded && !parent.firstChild && parent !== this._root) {
            parent.expanded = false;
            parent.handleChange(TreeNode._Change.ExpandedRemoved, parent);
        }

        if (parent.expanded) {
            this.requestInvalidation();
        }
    };

    VTree.prototype.clean = function () {
        // TODO: may be implement one by one nodes removal
        this._nodeCount = 0;
        this._rowCount = 0;
        this._root = new TreeNode();
        this._root.expanded = true;
        this._root.parent = this;
        this._dragNodes = null;
        this.requestInvalidation(true);
    };

    VTree.prototype.acceptChildren = function (visitor, visibleOnly, reverse, any) {
        return this._root.acceptChildren(visitor, visibleOnly, reverse, any);
    };

    VTree.prototype.getLastVisitedDroppable = function () {
        return this._lastVisitedDroppable;
    };

    /** override */
    VTree.prototype._updateScroller = function () {
        this._scroller.style.height = (this._rowCount * this._rowHeight + this._freeHeight).toString() + 'px';
    };

    /** override */
    VTree.prototype._renderViewport = function (index) {
        this._freeZone = null;
        this._lastVisitedDroppable = null;
        for (var j = 1, l = this._container.childNodes.length; j < l; j++) {
            this._container.childNodes[j].style.display = 'none';
            this._container.childNodes[j].setAttribute('data-clean', '');
        }

        if (this._rowCount && this._renderer && this._rowHeight) {
            var lastIndex = Math.min(this._rowCount, index + this._cachedRows);
            var fragment = document.createDocumentFragment();

            var it = new VTree.IdxIterator(this, index + 1, lastIndex, true);
            var i = index;
            for (var node = it.getFirstNode(); node != null; node = it.getNext(), ++i) {
                var row = document.createElement('div');
                row.id = VTree.ROW_ID;
                row.classList.add(this._rowStyle);
                row.style.top = (i * this._rowHeight).toString() + 'px';
                var padding = this._paddingLeft * (node.getNestLevel() - 1);
                row.style.paddingLeft = padding.toString() + 'px';
                if (node.expanded || node.firstChild) {
                    var expandElem = document.createElement('span');
                    if (node.expanded) {
                        expandElem.id = VTree.COLLAPSE_ID;
                    } else { // node.firstChild
                        expandElem.id = VTree.EXPAND_ID;
                    }
                    if (this._expandStyle) {
                        expandElem.classList.add(this._expandStyle);
                    }
                    this._expandRenderer(expandElem);
                    row.appendChild(expandElem);
                }
                row.addEventListener('click', this._nodeClick.bind(this, node));
                row.setAttribute('draggable', true);
                row.addEventListener('dragstart', this._nodeDragStart.bind(this, node));
                row.addEventListener('dragenter', this._nodeDragEnter.bind(this, node));
                row.addEventListener('dragover', this._nodeDragOver.bind(this, node));
                row.addEventListener('dragleave', this._nodeDragLeave.bind(this, node));
                row.addEventListener('drop', this._nodeDrop.bind(this, node));
                row._specCounter = 0;
                row._hasStyle = false;
                this._renderer(node, row);
                fragment.appendChild(row);
            }

            if (lastIndex == this._rowCount) {
                var freeZone = document.createElement('div');
                freeZone.style.position = 'absolute';
                freeZone.style.height = this._freeHeight.toString() + 'px';
                freeZone.style.top = (lastIndex * this._rowHeight).toString() + 'px';
                freeZone.addEventListener('dragenter', this._nodeDragEnter.bind(this, this._root));
                freeZone.addEventListener('dragover', this._nodeDragOver.bind(this, this._root));
                freeZone.addEventListener('dragleave', this._nodeDragLeave.bind(this, this._root));
                freeZone.addEventListener('drop', this._nodeDrop.bind(this, this._root));
                fragment.appendChild(freeZone);
                this._freeZone = freeZone;
            }

            this._container.appendChild(fragment);
            this._expandedWidth = this._container.scrollWidth;
            for (var j = 1, l = this._container.childNodes.length; j < l; j++) {
                if (this._container.childNodes[j].style.display !== 'none') {
                    var style = getComputedStyle(this._container.childNodes[j]);
                    this._container.childNodes[j].style.width = (this._expandedWidth - parseInt(style.paddingLeft)).toString() + 'px';
                }
            }
        }
    };

    VTree.prototype._initComputedVals = function () {
        this._containerWidth = parseInt(this._container.clientWidth);
        var testRow = document.createElement('div');
        testRow.classList.add(this._rowStyle);
        testRow.style.display = 'none';
        this._container.appendChild(testRow);
        var style = getComputedStyle(testRow);

        var padding = parseInt(style.paddingLeft);
        this._paddingLeft = padding !== null ? padding : VTree.DEFAULT_PADDING;

        var lineHeight = parseInt(style.lineHeight);
        this._rowHeight = lineHeight ? lineHeight : VTree.DEFAULT_LINE_HEIGHT;

        var testDownSep = document.createElement('div');
        testDownSep.classList.add(this._downSeparatorStyle);
        testDownSep.style.display = 'none';
        testRow.appendChild(testDownSep);
        this._downSepHeight = parseInt(getComputedStyle(testDownSep).height);

        this._expandedWidth = this._container.scrollWidth;

        this._container.removeChild(testRow);
    };

    VTree.prototype._insertNodeBefore = function (parent, reference, child) {
        child.parent = parent;
        if (reference != null) {
            child.next = reference;
            child.previous = reference.previous;
            reference.previous = child;
            if (child.previous == null) {
                parent.firstChild = child;
            } else {
                child.previous.next = child;
            }
        }
        else {
            if (parent.lastChild != null) {
                child.previous = parent.lastChild;
                parent.lastChild.next = child;
                parent.lastChild = child;
            }
            child.next = null;
        }

        if (parent.firstChild == null) {
            parent.firstChild = child;
            child.previous = null;
            child.next = null;
        }

        if (child.next == null) {
            parent.lastChild = child;
        }

        if (child.firstChild) {
            this._nodeCount += child.getNodeCount();
        } else {
            ++this._nodeCount;
        }

        if (child.expanded && child.firstChild) {
            this._updateRowCount();
        } else if (parent.expanded) {
            ++this._rowCount;
        }

        if (parent.expanded || !parent.expanded && parent.firstChild == parent.lastChild) {
            // redraw
            this.requestInvalidation();
        }

        return this;
    };

    VTree.prototype._expandRenderer = function (elem) {
        if (elem.id === VTree.COLLAPSE_ID) {
            elem.innerHTML = '&#9660;';
        } else if (elem.id === VTree.EXPAND_ID) {
            elem.innerHTML = '&#9658;';
        }
    };

    VTree.prototype._separatorRenderer = function (sep, paddingLevel) {
        var width = this._expandedWidth - this._paddingLeft * paddingLevel;
        sep.style.width = width.toString() + 'px';
        sep.style.height = this._freeHeight.toString() + 'px';
        sep.style.position = 'absolute';
        sep.style.pointerEvents = 'none';
        var span1 = document.createElement('span');
        var span2Style = null;
        if (sep.id == VTree.UPPER_SEP_ID) {
            span1.classList.add(this._upSeparatorSpan1Style);
            span2Style = this._upSeparatorSpan2Style ? this._upSeparatorSpan2Style : null;
            sep.style.top = '0px';
        } else {
            span1.classList.add(this._downSeparatorSpan1Style);
            span2Style = this._downSeparatorSpan2Style ? this._downSeparatorSpan2Style : null;
            sep.style.top = (this._rowHeight - this._freeHeight).toString() + 'px';
        }
        sep.appendChild(span1);
        var style = getComputedStyle(span1);
        if (span2Style) {
            var span2 = document.createElement('span');
            span2.classList.add(span2Style);
            sep.appendChild(span2);
        }
    };

    VTree.prototype._updateRowCount = function () {
        var i = 0;
        this._root.acceptChildren(function (node) {
            ++i;
            return true;
        }, true);
        this._rowCount = i;
    };

    VTree.prototype._getNodeByIdx = function (idx, visibleOnly) {
        var i = 0;
        var nodeRef = null;
        this._root.acceptChildren(function (node) {
            ++i;
            if (i == idx) {
                nodeRef = node;
                return false;
            }
            return true;
        }, visibleOnly);
        return nodeRef;
    };

    VTree.prototype._nodeHasSomeParent = function (node, parNode) {
        var res = false;
        for (var prnt = node.parent; prnt && (prnt instanceof TreeNode) && !res; prnt = prnt.parent) {
            res = (prnt === parNode);
        }
        return res;
    };

    VTree.prototype._nodeClick = function (node, e) {
        if ((node.expanded || node.firstChild) && (e.target.id === VTree.COLLAPSE_ID || e.target.id === VTree.EXPAND_ID)) {
            e.stopPropagation();
            node.handleExpand(e);
        } else if (this._clickCallback) {
            e.stopPropagation();
            this._clickCallback(node);
        }
    };

    VTree.prototype.setDragNodes = function (dragNodes) {
        if (dragNodes && dragNodes.length) {
            this._dragNodes = dragNodes.slice();
        }
    };

    VTree.prototype._nodeDragStart = function (node, e) {
        if (!this._dragNodes) {
            this._dragNodes = [node];
        }

        // Setup some dummy drag-data to ensure dragging
        e.dataTransfer.setData('text/plain', 'some_dummy_data');

        this._aScroll.enableAScroll();
    };

    VTree.prototype._nodeDragEnter = function (node, e) {
        e.preventDefault();
        e.stopPropagation();
        if (this._updateMarksTimerId) {
            clearTimeout(this._updateMarksTimerId);
        }
        this._updateMarksTimerId = setTimeout(function (node, row, offsetY) {
            this._updateMarks(node, row, offsetY, true);
        }.bind(this, node, e.currentTarget, e.layerY), 25);
        this._lastVisitedDroppable = e.currentTarget;
        return false;
    };

    VTree.prototype._nodeDragOver = function (node, e) {
        e.preventDefault();
        e.stopPropagation();
        if (this._updateMarksTimerId) {
            clearTimeout(this._updateMarksTimerId);
        }
        this._updateMarksTimerId = setTimeout(function (node, row, offsetY) {
            this._updateMarks(node, row, offsetY, false);
        }.bind(this, node, e.currentTarget, e.layerY), 25);
        this._aScroll.takeOnOffAction(e);
        return false;
    };

    VTree.prototype._nodeDragLeave = function (node, e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget._hasStyle) {
            if (!e.currentTarget._specCounter || e.currentTarget._specCounter <= 1) {
                e.currentTarget._specCounter = 0;
                e.currentTarget.classList.remove(this._insertIntoStyle);
                this._rowRemoveSep(e.currentTarget, VTree.LOWER_SEP_ID);
                this._rowRemoveSep(e.currentTarget, VTree.UPPER_SEP_ID);
                this._aScroll.takeOnOffAction(e);
            } else {
                --e.currentTarget._specCounter;
            }
        }
        return false;
    };

    VTree.prototype._nodeDrop = function (node, e) {
        e.preventDefault();
        e.stopPropagation();
        var row = this._lastVisitedDroppable ? this._lastVisitedDroppable : e.currentTarget;
        var offsetY = e.layerY;
        row._specCounter = 0;
        if (this._dropHereAllowed(node)) {
            row.classList.remove(this._insertIntoStyle);
            this._rowRemoveSep(row, VTree.LOWER_SEP_ID);
            this._rowRemoveSep(row, VTree.UPPER_SEP_ID);
            row._hasStyle = false;

            var dragNodesAllowed = []; // Assumed to be filled for insertion from top (idx = 0) to bottom
            var effectivePutLast = row === this._freeZone;
            if (this._dropUpperAllowed(node, offsetY, dragNodesAllowed, effectivePutLast)) {
                // If we don't have _dropAllowedCallback, dragNodesAllowed is not filled, and we should init it here
                if (!dragNodesAllowed.length) {
                    dragNodesAllowed = this._dragNodes;
                }
                this.beginUpdate();
                for (var i = 0; i < dragNodesAllowed.length; ++i) {
                    this.removeNode(dragNodesAllowed[i]);
                }
                if (node !== this._root) {
                    if (this._dropCallback) {
                        this._dropCallback(node.parent, node, node.previous ? node.previous : null, dragNodesAllowed);
                    }
                    for (var i = 0; i < dragNodesAllowed.length; ++i) {
                        this.insertNodeBefore(node, dragNodesAllowed[i]);
                    }
                } else {
                    // this._root node we may have only if release mouse on the free zone below all nodes,
                    // so just append it
                    if (this._dropCallback) {
                        this._dropCallback(this._root, null, effectivePutLast ? node.lastChild : null, dragNodesAllowed);
                    }
                    for (var i = 0; i < dragNodesAllowed.length; ++i) {
                        this.appendNode(node, dragNodesAllowed[i]);
                    }
                }
                this._dragNodes = null;
                this.endUpdate();
            } else if (this._dropLowerAllowed(node, offsetY, dragNodesAllowed)) {
                if (!dragNodesAllowed.length) {
                    dragNodesAllowed = this._dragNodes;
                }
                this.beginUpdate();
                for (var i = 0; i < dragNodesAllowed.length; ++i) {
                    this.removeNode(dragNodesAllowed[i]);
                }
                if (this._dropCallback) {
                    this._dropCallback(node.parent, node.next ? node.next : null, node, dragNodesAllowed);
                }
                for (var i = dragNodesAllowed.length; i > 0; --i) {
                    this.insertNodeAfter(node, dragNodesAllowed[i-1]);
                }
                this._dragNodes = null;
                this.endUpdate();
            } else if (this._dropInsideAllowed(node, dragNodesAllowed, effectivePutLast)) {
                if (!dragNodesAllowed.length) {
                    dragNodesAllowed = this._dragNodes;
                }
                this.beginUpdate();
                for (var i = 0; i < dragNodesAllowed.length; ++i) {
                    this.removeNode(dragNodesAllowed[i]);
                }
                if (this._dropCallback) {
                    this._dropCallback(node, null, null, dragNodesAllowed);
                }
                if (this._putLastChildWhenInside || effectivePutLast) {
                    for (var i = 0; i < dragNodesAllowed.length; ++i) {
                        this.appendNode(node, dragNodesAllowed[i]);
                    }
                } else {
                    for (var i = dragNodesAllowed.length; i > 0; --i) {
                        this.prependNode(node, dragNodesAllowed[i-1]);
                    }
                }
                this._dragNodes = null;
                this.endUpdate();
            }
        }

        this._dragNodes = null;
        this._aScroll.disableAScroll();
        return false;
    };

    VTree.prototype._dropHereAllowed = function (node) {
        var res = this._dragNodes && this._dragNodes.length;
        for (var i = 0; res && i < this._dragNodes.length; ++i) {
            var dragNode = this._dragNodes[i];
            res = dragNode !== node && !this._nodeHasSomeParent(node, dragNode);
        }
        return res;
    };

    VTree.prototype._dropUpperAllowed = function (node, offsetY, dragNodesAllowed, effectivePutLast) {
        var res = offsetY <= this._freeHeight && (this._dragNodes.length > 1 || node !== this._dragNodes[0].next);
        if (res && this._dropAllowedCallback) {
            res = node !== this._root &&
                this._dropAllowedCallback(node.parent, node, node.previous ? node.previous : null, this._dragNodes, dragNodesAllowed) ||
                node === this._root && this._dropInsideAllowed(node, dragNodesAllowed, effectivePutLast);
        }
        return res;
    };

    VTree.prototype._dropLowerAllowed = function (node, offsetY, dragNodesAllowed) {
        var res = offsetY >= this._rowHeight - this._freeHeight && !node.expanded
            && node !== this._root && (this._dragNodes.length > 1 || this._dragNodes[0] !== node.next);

        if (res && this._dropAllowedCallback) {
            res = this._dropAllowedCallback(node.parent, node.next ? node.next : null, node, this._dragNodes, dragNodesAllowed);
        }
        return res;
    };

    VTree.prototype._dropInsideAllowed = function (node, dragNodesAllowed, effectivePutLast) {
        var putLast = effectivePutLast ? effectivePutLast : this._putLastChildWhenInside;
        var res = this._dragNodes.length > 1 || !(this._dragNodes[0].parent === node &&
            (putLast && node.lastChild === this._dragNodes[0] ||
                !putLast && node.firstChild === this._dragNodes[0]));
        if (res && this._dropAllowedCallback) {
            res = this._dropAllowedCallback(node, null, null, this._dragNodes, dragNodesAllowed);
        }
        return res;
    };

    VTree.prototype._drawUpperSeparator = function (node, row) {
        var paddingLevel = node === this._root ? 0 : node.getNestLevel() - 1;
        this._rowAddSep(row, VTree.UPPER_SEP_ID, paddingLevel);
    };

    VTree.prototype._drawLowerSeparator = function (node, row) {
        var paddingLevel = node.getNestLevel() - 1;
        this._rowAddSep(row, VTree.LOWER_SEP_ID, paddingLevel);
    };

    VTree.prototype._updateMarks = function (node, row, offsetY, updateCounter) {
        if (this._dropHereAllowed(node)) {
            var effectivePutLast = row === this._freeZone;
            if (this._dropUpperAllowed(node, offsetY, null, effectivePutLast)) {
                if (!this._rowHasSep(row, VTree.UPPER_SEP_ID)) {
                    this._rowRemoveSep(row, VTree.LOWER_SEP_ID);

                    row._specCounter = 0;
                    row.classList.remove(this._insertIntoStyle);

                    this._drawUpperSeparator(node, row);
                }
            } else if (this._dropLowerAllowed(node, offsetY)) {
                if (!this._rowHasSep(row, VTree.LOWER_SEP_ID)) {
                    this._rowRemoveSep(row, VTree.UPPER_SEP_ID);

                    row._specCounter = 0;
                    row.classList.remove(this._insertIntoStyle);

                    this._drawLowerSeparator(node, row);
                }
            } else if (node !== this._root && this._dropInsideAllowed(node)) {
                this._rowRemoveSep(row, VTree.LOWER_SEP_ID);
                this._rowRemoveSep(row, VTree.UPPER_SEP_ID);
                row.classList.add(this._insertIntoStyle);
                row._hasStyle = true;
                if (updateCounter) {
                    if (!row._specCounter) {
                        row._specCounter = 1;
                    } else {
                        ++row._specCounter;
                    }
                }
            }
        }
    };

    VTree.prototype._rowHasSep = function (row, sepId) {
        for (var j = 1, l = row.childNodes.length; j < l; j++) {
            if (row.childNodes[j].id === sepId) {
                return true;
            }
        }
        return false;
    };

    VTree.prototype._rowAddSep = function (row, sepId, paddingLevel) {
        var sep = document.createElement('div');
        sep.id = sepId;
        this._separatorRenderer(sep, paddingLevel);
        if (sepId == VTree.UPPER_SEP_ID) {
            row.insertBefore(sep, row.firstChild);
        } else {
            row.appendChild(sep);
        }
        row._hasStyle = true;
    };

    VTree.prototype._rowRemoveSep = function (row, sepId) {
        for (var l = row.childNodes.length, j = l - 1; j >= 0; --j) {
            if (row.childNodes[j].id === sepId) {
                row.removeChild(row.childNodes[j]);
            }
        }
    };

    VTree.prototype.toString = function () {
        return "[VTree]";
    };

    _.TreeNode = TreeNode;
    _.TreeNodeNamed = TreeNodeNamed;
    _.VTree = VTree;
})(this);
