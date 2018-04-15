/*jshint esversion: 6 */
function TABULAR() {
    this.unique = parseInt(Math.random() * 1000).toString();
    this.eleId, this.tableEle, this.parentNode, this.tableHeadNode , this.tableFootNode, this.numOfRows , this.numOfColumns;
    this.headerMap = {};
    this.tableData = [];
    this.rowLimitOps = [10, 15, 30, 50, 100];
    this.rowsPerPage = this.getMinInArray(this.rowLimitOps) || 5; //default
    this.currentPage = 1; //Default - required for pagination
    this.totalPages = this.getTotalNumberOfPages(); // required for pagination
    this.currentPageInfo = new Map();
    this.paginationFlag = true;
    this.sortIndex = 0; //Default
    this.sortSeq = "asc"; //default
    this.filterKeyword = '';

    /**
     * Initialising all unique ids
     */
    this.tableHeadId = "t-h-" + this.unique;
    this.tableFootId = "t-f-" + this.unique;
    this.pageInfoSpanId = "pg-inf-" + this.unique;
    this.rwLimitId = "rw-l-" + this.unique;
    this.paginationId = 'pgn-' + this.unique;
    this.filterKeywordId = 'flt-kw-' + this.unique;
}

TABULAR.prototype.getMinInArray = function (array) {
    if(!array){
      return null;
   }
   return Math.min(...array);
};

TABULAR.prototype.convertToTabular = function (id, headerConfig = false, actions = false) {
    if ('' === id || !id) {
        console.error("`id` of the Source Table required..");
        return false;
    }

    this.eleId = id;
    this.tableEle = _$(id);
    this.tableEle.classList.add("tabular"); //Added class to table tag
    let gparent = this.tableEle.parentNode;
    gparent.removeChild(this.tableEle);
    this.parentNode = this.pushElementsInsideDiv([this.pushElementsInsideDiv([this.tableEle], ["tb-ovrflw"])]);
    this.parentNode.id = 'tblr-prnt-' + this.unique;
    gparent.appendChild(this.parentNode);

    this.getTableData();

    this._init();
};

/**
 * Call to build a 'tabular' table from an array of JSON
 * @param data - Array of JSON - REQUIRED
 * @param targetId - Target id of the element where the table will be appended - REQUIRED
 * @param config - Config JSON - OPTIONAL
 */
TABULAR.prototype.buildTabular = function (targetId, data, headerConfig = false, actions = false) {
    if (!data || 'object' !== typeof data) {
        console.error("Invalid data format. The data must be an Array of Objects..");
        return false;
    }

    // if(!targetId || '' === targetId){
    //     console.error("Target Id of the element is required...");
    //     return false;
    // }

    //Now creating new Table Element and its parent
    this.tableEle = document.createElement("TABLE");
    this.tableEle.id = "tabular_" + this.unique;
    this.tableEle.classList.add("tabular");
    // this.parentNode = this.pushElementsInsideDiv([this.tableEle]);
    this.parentNode = this.pushElementsInsideDiv([this.pushElementsInsideDiv([this.tableEle], ["tb-ovrflw"])]);
    let gp = _$(targetId);
    gp.appendChild(this.parentNode);

    this.buildTableData(data, headerConfig);
    console.log(this.headerMap, "DATA->", this.tableData);
    console.log(this.headerMap, this.tableData);

    this._init();
};

TABULAR.prototype._init = function (update = false) {
    if (update) {
        this.currentPage = 1;

        /**
         * Setting current page info
         */
        this.getCurrentPageInfo();

        /**
         * Making DOM modifications to table
         */
        this.addDOMFootProperties();
    }
    else {
        /**
         * Initialize Listeners
         */
        this.getNumberOfRows();
        this.initializeListeners(this);

        /**
         * Setting current page info
         */
        this.getCurrentPageInfo();

        /**
         * Making DOM modifications to table
         */
        this.addDOMHeadProperties();
        this.addDOMFootProperties();
    }

    /**
     * Setting Table Data
     */
    this.setTableData();

    /**
     * Update Page Info Span
     */
    this.updatePageInfoSpan();

    /**
     * Checking and Showing Pagination
     */
    if (this.getTotalNumberOfPages() > 1) {
        this.tableFootNode.appendChild(this.getPaginationHtml());
    }
};

TABULAR.prototype.addDOMHeadProperties = function () {
    this.parentNode.insertBefore(this.attachTableTopDiv(), this.parentNode.firstChild);
    this.tableHeadNode = _$(this.tableHeadId);
};

TABULAR.prototype.addDOMFootProperties = function () {
    if (_$(this.tableFootId))
        _$(this.tableFootId).innerHTML = '';
    this.parentNode.appendChild(this.attachTableBottomDiv());
    this.tableFootNode = _$(this.tableFootId);
};

TABULAR.prototype.attachTableTopDiv = function () {
    let divEle = '';
    if (_$(this.tableHeadId)) {
        divEle = _$(this.tableHeadId);
        divEle.innerHTML = '';
    } else {
        divEle = document.createElement("DIV");
        divEle.id = this.tableHeadId;
    }
    if (!divEle.classList.contains("thead"))
        divEle.classList.add("thead");

    //Attaching the Rows per Page DropDown
    divEle.appendChild(this.createNumRowsDropDown());
    // divEle.appendChild(this.createSearchInput());
    return divEle;
};

TABULAR.prototype.attachTableBottomDiv = function () {
    let divEle = '';
    if (_$(this.tableFootId)) {
        divEle = _$(this.tableFootId);
        divEle.innerHTML = '';
    } else {
        divEle = document.createElement("DIV");
        divEle.id = this.tableFootId;
    }
    if (!divEle.classList.contains("tfoot"))
        divEle.classList.add("tfoot");
    //Attaching the Rows per Page DropDown
    divEle.appendChild(this.createPageInfoSpan());
    return divEle;
};

TABULAR.prototype.createNumRowsDropDown = function () {
    let dd = [];
    dd[0] = document.createElement("LABEL");
    dd[0].innerHTML = "Rows per page:";
    dd[1] = document.createElement("SELECT");
    dd[1].id = this.rwLimitId;
    this.rowLimitOps.forEach(n => {
        let op = new Option();
        op.value = n;
        op.text = n;
        dd[1].options.add(op);
    });
    //Using function 'pushElementsInsideDiv' to put label and select inside one div
    return this.pushElementsInsideDiv(dd);
};

/**
 * @param ele : array of elements to be pushed inside a div
 * @return {*} : the div element is returned containing the array elements as its children
 */
TABULAR.prototype.pushElementsInsideDiv = function (ele, classArr = []) {
    // console.log(ele);
    let divEle = document.createElement("DIV");
    if (classArr.length) {
        for (let c of classArr)
            divEle.classList.add(c);
    }

    for (let i of ele)
        divEle.appendChild(i);
    return divEle;
};

TABULAR.prototype.createPageInfoSpan = function () {
    let pgSpan = '';
    //clear span if any
    if (_$(this.pageInfoSpanId))
        pgSpan = _$(this.pageInfoSpanId);
    else {
        pgSpan = document.createElement("SPAN");
        pgSpan.id = this.pageInfoSpanId;
    }
    pgSpan.innerHTML = ``;
    pgSpan.innerHTML = `Showing ${this.currentPageInfo.get('startRow')} to ${this.currentPageInfo.get('endRow')} of ${this.numOfRows} entries`;
    return pgSpan;
};

TABULAR.prototype.updatePageInfoSpan = function () {
    let pgSpan = '';
    //clear span if any
    if (_$(this.pageInfoSpanId)) {
        pgSpan = _$(this.pageInfoSpanId);
        pgSpan.innerHTML = ``;
        pgSpan.innerHTML = `Showing ${this.getCurrentPageInfo().get('startRow')} to ${this.getCurrentPageInfo().get('endRow')} of ${this.numOfRows} entries`;
    }
};

TABULAR.prototype.createSearchInput = function () {
    let searchInput = document.createElement("INPUT");
    searchInput.id = this.filterKeywordId;
    searchInput.placeholder = "Search";
    return searchInput;
};

TABULAR.prototype.getNumberOfRows = function () {
    if (this.tableData && this.tableData.length)
        this.numOfRows = this.tableData.length;
    else
        this.numOfRows = this.tableEle.rows.length - 1; //-1 to remove header row in count

    return this.numOfRows;
};

TABULAR.prototype.getNumberOfColumns = function () {
    this.numOfColumns = this.tableEle.rows.item(0).cells.length;
    return this.numOfColumns;
};

TABULAR.prototype.getTotalNumberOfPages = function () {
    this.totalPages = Math.ceil(this.numOfRows / this.rowsPerPage);
    return this.totalPages;
};

TABULAR.prototype.getCurrentPageInfo = function () {
    let startRow = this.rowsPerPage * (this.currentPage - 1) + 1;
    let endRow = this.rowsPerPage * (this.currentPage - 1) + this.rowsPerPage;
    if (endRow > this.numOfRows)
        endRow = this.numOfRows;

    this.currentPageInfo.set('startRow', startRow);
    this.currentPageInfo.set('endRow', endRow);
    this.currentPageInfo.set('startRowIndex', startRow - 1);
    this.currentPageInfo.set('endRowIndex', endRow - 1);
    return this.currentPageInfo;
};

TABULAR.prototype.updatePageInfo = function () {
    this.getTotalNumberOfPages();
    this.getCurrentPageInfo();
    this.updatePageInfoSpan();
};

TABULAR.prototype.getTableData = function () {
    try {
        /**
         * Getting headers first from <th>
         */
        let hdrArrKeys = [];
        let headerRow = this.tableEle.rows.item(0).cells;
        for (let hdr of headerRow) {
            let val = hdr.innerHTML;
            this.headerMap[val.toLowerCase().replace(/[\s\\.]/, '_')] = val;
            hdrArrKeys.push(val.toLowerCase().replace(/[\s\\.]/, '_'));
        }
        // let startIndex = 0;
        let data = [];

        /**
         * !!!IMPORTANT - Throwing error if no <TH> found for header cells...
         */
        if ("TH" !== this.tableEle.rows.item(0).cells.item(0).nodeName)
            throw "No <TH> found inside header row. Please provide header cells with <TH>";

        //Considering first row as header row, which is mandatory
        let headerSkip = true;
        for (let r of this.tableEle.rows) {
            if (headerSkip) {
                headerSkip = false;
                continue;
            }

            let localJson = {};
            let cellCount = 0;
            while (cellCount < hdrArrKeys.length) {
                localJson[hdrArrKeys[cellCount]] = r.cells[cellCount].innerHTML;
                cellCount++;
            }
            localJson && Object.keys(localJson).length ? data.push(localJson) : false;
        }
        this.tableData = data;
    }
    catch (err) {
        console.error(err);
    }
};

TABULAR.prototype.buildTableData = function (srcData, config = false) {
    let headerConfig = false;
    let data = [];
    if (config && 'object' === typeof config && Object.keys(config).length) {
        this.headerMap = this.setTableHeader(config);
        headerConfig = config;
    }

    for (let row of srcData) {
        let arr = {};
        if (headerConfig) {
            Object.keys(headerConfig).forEach(hm => {
                arr[hm] = {};
                arr[hm] = headerConfig[hm] ? this.getCellDataAccordingToConfig(row[hm] || "", headerConfig[hm] || {}) : row[hm] || "";//row[hm] || "";
            });
        } else {
            Object.keys(row).forEach(c => {
                this.headerMap[c.toLowerCase().replace(/\s/, '-')] = c;
                arr[c] = {};
                arr[c] = row[c];
            });
        }
        data.push(arr);
    }

    this.tableData = data;
};

TABULAR.prototype.getCellDataAccordingToConfig = (cell, conf) => {

    if (conf && "html" !== conf["type"]) {
        /**
         * If type of Cell Entity is LINK
         */
        if("link" === conf["type"]){
            let lnk = document.createElement("A");
            lnk.href = cell;

            if(conf["iconClass"]){
                let icn = document.createElement("I");
                conf["iconClass"].split(' ').forEach(cls => {
                    icn.classList.add(cls);
                });
                lnk.appendChild(icn);
            }

            if(conf["title"]){
                let t = document.createTextNode(conf["title"]);
                lnk.appendChild(t);
            } else {
                let t = document.createTextNode("Link");
                lnk.appendChild(t);
            }

            return lnk;
        }
        /**
         * If type of Cell Entity is BUTTON
         */
        else if("button" === conf["type"]){
            let btn = document.createElement("BUTTON");

            return btn;
        }
    } else {
        return cell;
    }
};

TABULAR.prototype.setTableHeader = (config) => {
    let hMap = {};
    Object.keys(config).forEach(key => {
        hMap[key] = {};
        hMap[key] = config[key] && config[key]["label"] ? config[key]["label"] : (key.toUpperCase() || key);
    })
    return hMap;
};

TABULAR.prototype.setTableData = function () {
    //Clean the table first
    this.tableEle.innerHTML = '';

    //Stitch Table Headers first
    let head = this.tableEle.createTHead();
    let hRow = head.insertRow(0);
    Object.keys(this.headerMap).forEach(hdr => {
        let hCell = document.createElement("TH");
        hCell.innerHTML = this.headerMap[hdr];
        hRow.appendChild(hCell);
    });

    // this.getCurrentPageInfo();
    //Now stitching data to table
    //Calculate Starting Index
    let outerIndex = this.currentPageInfo.get('startRowIndex');
    let outerIndexLimit = this.currentPageInfo.get('endRowIndex');
    let tBody = this.tableEle.appendChild(document.createElement("TBODY"));
    let tRowIndex = 0;
    while (outerIndex <= outerIndexLimit) {
        let tRow = tBody.insertRow(tRowIndex);
        let innerIndex = 0;
        Object.keys(this.tableData[outerIndex]).forEach(cell => {
            let content = this.tableData[outerIndex][cell];
            if(null === content || !content.nodeType)
                tRow.insertCell(innerIndex).innerHTML = content;
            else{
                let c = tRow.insertCell(innerIndex);
                c.appendChild(content);
            }
            innerIndex++;
        });
        if (Object.keys(this.headerMap).length !== (innerIndex)) {
            let diff = Object.keys(this.headerMap).length - (innerIndex);
            while (diff !== 0) {
                tRow.insertCell(innerIndex).innerHTML = "";
                diff--;
            }
        }

        tRowIndex++;
        outerIndex++;
    }
};

TABULAR.prototype.redrawTable = function () {
    this.setTableData();
    this.updatePageInfoSpan();
    this.modifyPagination();
};

TABULAR.prototype.changePage = function (tgtPage) {
    if ('NEXT' === tgtPage.value) {
        this.currentPage = this.currentPage + 1;
    } else if ('PREV' === tgtPage.value) {
        this.currentPage = this.currentPage - 1;
    } else {
        this.currentPage = parseInt(tgtPage.value);
    }
    this.getCurrentPageInfo();
    this.redrawTable();
};

/**
 * PAGINATION
 */
TABULAR.prototype.paginStart = 1;
TABULAR.prototype.paginEnd = 5;
TABULAR.prototype.getPaginationHtml = function (shift = false) {
    let paginHtml = [];
    let btnCount = this.paginStart;
    while (btnCount <= this.paginEnd && btnCount <= this.getTotalNumberOfPages()) {
        let aTag = document.createElement("A");
        aTag.value = btnCount;
        aTag.text = btnCount;
        aTag.classList.add('paginate_button');
        if (this.currentPage === btnCount)
            aTag.classList.add('current');
        paginHtml.push(aTag);
        btnCount++;
    }

    let div1 = '';
    if (shift && _$(this.paginationId)) {
        div1 = _$(this.paginationId);
        div1.innerHTML = "";
    } else {
        div1 = document.createElement("DIV");
        div1.id = this.paginationId;
        div1.classList.add("pagination");
    }
    let aN = document.createElement("A");
    aN.value = "NEXT";
    aN.innerHTML = "&#8680;";
    aN.classList.add('paginate_button');
    if (this.getTotalNumberOfPages() === this.currentPage)
        aN.classList.add('disabled');

    let aP = document.createElement("A");
    aP.value = "PREV";
    aP.innerHTML = "&#8678;";
    aP.classList.add('paginate_button');
    if (1 === this.currentPage)
        aP.classList.add('disabled');

    div1.appendChild(aP);
    for (let t of paginHtml)
        div1.appendChild(t);
    div1.appendChild(aN);

    return div1;
};

TABULAR.prototype.modifyPagination = function () {
    if ((this.paginEnd - this.currentPage === 0) && this.getTotalNumberOfPages() !== this.currentPage) {
        this.paginEnd++;
        this.paginStart++;
    } else if ((this.currentPage - this.paginStart === 0) && 1 !== this.currentPage) {
        this.paginEnd--;
        this.paginStart--;
    }
    this.tableFootNode.appendChild(this.getPaginationHtml(true));
};

TABULAR.prototype.initializeListeners = function () {
    let self = this;
    /**
     * Handle All Click Events
     */
    this.parentNode.addEventListener("click", function (e) {
        /**
         * Handle Pagination Click Events Below
         */
        if (e.target && e.target.value && e.target.classList.contains('paginate_button') && !e.target.classList.contains('disabled'))
            self.changePage(e.target);
        else
            return false;

        /**
         * Handle Sorting Click Events Below
         */
        //--->(Put sorting handler here)


    });

    /**
     * Handle All Change Events
     */
    this.parentNode.addEventListener("change", function (e) {
        /**
         * Handle Row-Limit Change Event
         */
        if (e.target && e.target.value && self.rwLimitId === e.target.id) {
            self.rowsPerPage = parseInt(e.target.value);
            self._init(true);
        } else
            return false;
    });

    /**
     * Handle All KeyUp Events
     */
    this.parentNode.addEventListener("keyup", function (e) {
        if (e.target && e.target.value && '' !== e.target.value && "filter-keyword" === e.target.id) {
            console.log(e.target.value);
        } else
            return false;
    });
};

_$ = function (id) {
    return document.getElementById(id);
};
