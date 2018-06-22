let global = {};

/*jshint esversion: 6 */
function TABULAR() {
    this.unique = parseInt(Math.random() * 1000).toString();
    this.eleId, this.tableEle, this.parentNode, this.tableHeadNode, this.tableFootNode, this.numOfRows, this.numOfColumns;
    this.headerMap = {};
    this.srcData = [];
    this.tableData = [];
    this.rowLimitOps = [15, 30, 50, 100];
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
    this.tbodyId = 'tbody-' + this.unique;
    this.dataFilters = {};
}

TABULAR.prototype.getMinInArray = function (array) {
    if (!array) {
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
    this.parentNode.classList.add("tabular-parent");
    gparent.appendChild(this.parentNode);

    this.getTableData();

    this._init();
};

/**
 * Call to build a 'tabular' table from an array of JSON
 * @param data - Array of JSON                                                  - REQUIRED
 * @param targetId - Target id of the element where the table will be appended  - REQUIRED
 * @param headerConfig - Config JSON                                            - OPTIONAL
 * @param actions - Provide action buttons config                               - OPTIONAL
 */
TABULAR.prototype.buildTabular = function (targetId, data, headerConfig = false, actions = false, preProcessFuncs = false) {
    if (!data || 'object' !== typeof data) {
        console.error("Invalid data format. The data must be an Array of Objects..");
        return false;
    }

    if (!targetId || '' === targetId) {
        console.error("Target Id of the element is required...");
        return false;
    }

    //Now creating new Table Element and its parent
    this.tableEle = document.createElement("TABLE");
    this.tableEle.id = "tabular_" + this.unique;
    this.tableEle.classList.add("tabular");
    // this.parentNode = this.pushElementsInsideDiv([this.tableEle]);
    this.parentNode = this.pushElementsInsideDiv([this.pushElementsInsideDiv([this.tableEle], ["tb-ovrflw"])], ["tabular-parent"]);
    let gp = _$(targetId);
    gp.appendChild(this.parentNode);

    this.buildTableData(data, headerConfig);

    this._init();
};

TABULAR.prototype._init = function (update = false) {
    if (update) {
        this.currentPage = 1;

        /**
         * Updating Number of Rows
         */
        this.getNumberOfRows();

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

        this.setTableHeaderData();
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

TABULAR.prototype._filter = function () {
    let filteredData = [];
    let filters = this.dataFilters;
    for (let d of this.srcData) {
        let cond = true;
        Object.keys(filters).forEach(f => {
            let cell = d[filters[f]["hdr"]];
            let keyword = filters[f]["keyword"];
            if (keyword) {
                if (cell.nodeName && "LABEL" === cell.nodeName && cell.innerText === keyword)
                    cond = cond && true;
                else
                    cond = cond && false;
            }
        });
        if (cond)
            filteredData.push(d);
    }
    this.tableData = filteredData;
    // console.log("filtered", this.tableData);
    this._init(true);
}

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
    divEle.appendChild(this.updatePageInfoSpan());
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

TABULAR.prototype.createFilterDropDown = function (hdr, ops) {
    let filter = '';
    filter = document.createElement("SELECT");
    filter.id = "filter-" + hdr + "-" + this.unique;
    this.dataFilters[filter.id] = {};
    this.dataFilters[filter.id]["hdr"] = hdr;

    let defOp = new Option();
    defOp.value = "--all--";
    defOp.text = '--All--';
    filter.options.add(defOp);
    ops.forEach(n => {
        let op = new Option();
        op.value = n;
        op.text = n;
        filter.options.add(op);
    });
    //Using function 'pushElementsInsideDiv' to put label and select inside one div
    return this.pushElementsInsideDiv([filter], ['filter-dropdown']);
};

/**
 * @param ele : array of elements to be pushed inside a div
 * @return {*} : the div element is returned containing the array elements as its children
 */
TABULAR.prototype.pushElementsInsideDiv = function (ele, classArr = []) {
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
        this.getCurrentPageInfo(); //Updating Indices
        pgSpan = _$(this.pageInfoSpanId);
        pgSpan.innerHTML = ``;
        pgSpan.innerHTML = `Showing ${this.currentPageInfo.get('startRow')} to ${this.currentPageInfo.get('endRow')} of ${this.numOfRows} entries`;
    } else {
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
    }
};

TABULAR.prototype.createSearchInput = function () {
    let searchInput = document.createElement("INPUT");
    searchInput.id = this.filterKeywordId;
    searchInput.placeholder = "Search";
    return searchInput;
};


TABULAR.prototype.createStatusLabel = function (text, cls) {
    let lbl = document.createElement("LABEL");
    lbl.classList.add('label');
    cls ? lbl.classList.add(cls) : lbl.classList.add("label-default");
    lbl.innerText = text;
    return lbl;
};

TABULAR.prototype.createModalPopupFromConf = function (h, b, f) {
    this.createModalPopup(h, b, f);
}

TABULAR.prototype.createModalPopup = function (header, body, footer) {
    let modal = document.createElement("DIV");
    modal.classList.add('modal');

    let closeBtn = document.createElement('BUTTON');
    closeBtn.classList.add('close');
    closeBtn.setAttribute('data-dismiss', 'modal');

    let mDialog = document.createElement("DIV");
    mDialog.classList.add('modal-dialog');
    let mContent = document.createElement("DIV");
    mContent.classList.add('modal-content');
    let mHeader = document.createElement("DIV");
    mHeader.classList.add('modal-header');
    mHeader.innerHTML = header;
    /**
     * Adding Close Btn to header
     */
    let closeBtn1 = document.createElement('BUTTON');
    let closeBtn2 = document.createElement('BUTTON');
    closeBtn1.classList.add('close');
    closeBtn1.setAttribute('data-dismiss', 'modal');
    closeBtn2.setAttribute('data-dismiss', 'modal');
    // let closeSpan = document.createElement('SPAN');
    // closeSpan.setAttribute('aria-hidden', true);
    // // closeSpan.innerText = `x`;
    // closeBtn1.appendChild(closeSpan);
    mHeader.appendChild(closeBtn1)

    let mBody = document.createElement("DIV");
    mBody.classList.add('modal-body');
    mBody.innerHTML = body;
    let mFooter = document.createElement("DIV");
    mFooter.classList.add('modal-footer');
    mFooter.innerHTML = footer;
    /**
     * Adding Close Btn to Footer
     */
    closeBtn2.classList.add('btn');
    closeBtn2.classList.add('btn-default');
    closeBtn2.innerText = 'Close';
    mFooter.appendChild(closeBtn2);

    mContent.appendChild(mHeader)
    mContent.appendChild(mBody);
    mContent.appendChild(mFooter);

    mDialog.appendChild(mContent);

    modal.appendChild(mDialog);

    this.tableEle.parentElement.appendChild(modal);
    return modal;
}

TABULAR.prototype.getNumberOfRows = function () {
    if (this.tableData && this.tableData.length)
        this.numOfRows = this.tableData.length;
    else
        this.numOfRows = 0;// this.numOfRows = this.tableEle.rows.length - 1; //-1 to remove header row in count

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
    let startRow = this.numOfRows ? this.rowsPerPage * (this.currentPage - 1) + 1 : 0;
    let endRow = this.rowsPerPage * (this.currentPage - 1) + this.rowsPerPage;
    if (endRow > this.numOfRows)
        endRow = this.numOfRows;

    this.currentPageInfo.set('startRow', startRow);
    this.currentPageInfo.set('endRow', endRow);
    this.currentPageInfo.set('startRowIndex', startRow - 1);
    this.currentPageInfo.set('endRowIndex', endRow - 1);
    return this.currentPageInfo;
};

// TABULAR.prototype.updatePageInfo = function () {
//     this.getTotalNumberOfPages();
//     this.getCurrentPageInfo();
//     this.updatePageInfoSpan();
// };

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

TABULAR.prototype.buildTableData = function (srcData, config = false, filter = false) {
    let headerConfig = false;
    let data = [];
    if (config && 'object' === typeof config && Object.keys(config).length) {
        this.headerMap = this.setTableHeader(config);
        headerConfig = config;
    }
    for (let row of srcData) {
        let arr = {};
        if (headerConfig) {
            if (headerConfig["fields"]) {
                Object.keys(headerConfig["fields"]).forEach(hm => {
                    // if (hm.indexOf('->') > -1) {
                    //     hmE = hm.split('->');
                    //     arr[hm] = {};
                    //     arr[hm] = this.getCellDataAccordingToConfig(this, row[hmE[0]][hmE[1]] || "", headerConfig["fields"][hm] || {});
                    // } else {
                    //     arr[hm] = {};
                    //     arr[hm] = this.getCellDataAccordingToConfig(this, row[hm] || "", headerConfig["fields"][hm] || {});
                    // }
                    arr[hm] = {};
                    arr[hm] = headerConfig["fields"][hm] && Object.keys(headerConfig["fields"][hm]).length ? this.getCellDataAccordingToConfig(this, row[hm] || "", headerConfig["fields"][hm] || {}) : row[hm] || "";//row[hm] || "";
                });
            }

            if (headerConfig["_Labels_"]) {
                arr["Labels_"] = "";
            }
            if (headerConfig["_Actions_"]) {
                let actBtns = this.getActionButtons(headerConfig["_Actions_"], row);
                if (actBtns)
                    arr["_Actions_"] = actBtns;
            }
            Object.keys(row).forEach(c => {
                if ((headerConfig['allowedAll'])) {
                    if (!this.headerMap[c] && !this.headerMap[c.toLowerCase().replace(/\s/, '-')]) {
                        this.headerMap[c.toLowerCase().replace(/\s/, '-')] = c;
                        arr[c] = {};
                        arr[c] = row[c];
                    }
                }
            });
        } else {
            Object.keys(row).forEach(c => {
                this.headerMap[c.toLowerCase().replace(/\s/, '-')] = {};
                this.headerMap[c.toLowerCase().replace(/\s/, '-')].label = c;
                arr[c] = {};
                arr[c] = row[c];
            });
        }
        data.push(arr);
    }
    this.srcData = data;
    if (filter)
        data = this._filter();

    this.tableData = data;
};

TABULAR.prototype.getActionButtons = function (conf, row) {
    let actConf = conf["actions"];
    let preProcess = conf["actionConditions"]["preProcessor"] || false;
    let refFieldValue = conf["actionConditions"]["refField"] || false;
    let allowedActions = [];
    let btnDiv = document.createElement("DIV");

    // allowedActions = preProcess(refFieldValue);
    if (!preProcess) {
        allowedActions = Object.keys(actConf);
    } else {
        if (!refFieldValue)
            allowedActions = preProcess(row);
        else
            allowedActions = preProcess(row[refFieldValue]);
    }

    for (let act of allowedActions) {
        let cond = actConf[act] ? actConf[act] : false;
        if (cond) {
            let btn = document.createElement("BUTTON");
            btn.classList.add('btn');
            btn.classList.add(cond["buttonClass"] ? cond["buttonClass"] : 'btn-default');

            // btn.innerText = cond['title'] ? cond['title'] : "no title";
            let txt = '';
            if (cond["title"] && "string" === typeof cond["title"]) {
                txt = cond["title"];
            } else if (cond["title"] && "function" === typeof cond["title"]) {
                txt = cond["title"](row);
            } else {
                txt = "No-title";
            }
            btn.innerText = txt;

            btn.setAttribute('row-data', JSON.stringify(row)); // Mandatory attribute containing row-data
            // if(cond["attributes"] && Object.keys(cond["attributes"]).length){
            //     /**
            //      * Attach Attributes
            //      */
            //     Object.keys(cond["attributes"]).forEach(k => {

            //     });
            // }
            if (cond["func"] && "function" === typeof cond["func"]) {
                let self = this;
                btn.addEventListener('click', (function () {
                    // self.createModalPopup(self, row._id, `Modal Body`, `Modal Footer`);
                    cond["func"](row);
                }).bind(self));
            }

            btnDiv.appendChild(btn);
        }
    }
    return btnDiv;
}

TABULAR.prototype.getCellDataAccordingToConfig = function (self, cell, conf) {
    if (conf && conf["type"] && "html" !== conf["type"]) {
        /**
         * If type of Cell Entity is LINK
         */
        if ("link" === conf["type"]) {
            let lnk = document.createElement("A");
            lnk.href = cell;

            if (conf["iconClass"]) {
                let icn = document.createElement("I");
                conf["iconClass"].split(' ').forEach(cls => {
                    icn.classList.add(cls);
                });
                lnk.appendChild(icn);
            }

            if (conf["title"]) {
                let t = document.createTextNode(conf["title"]);
                lnk.appendChild(t);
            } else {
                let t = document.createTextNode("Link");
                lnk.appendChild(t);
            }

            if (conf["attributes"] && Object.keys(conf["attributes"]).length) {
                /**
                * Attach Attributes
                */
                Object.keys(conf["attributes"]).forEach(k => {
                    lnk.setAttribute(k, conf["attributes"][k]);
                });
            }

            return lnk;
        }
        /**
         * If type of Cell Entity is LABEL
         */
        else if ("label" === conf["type"]) {
            let txt = cell;
            let label = '';
            if (conf["title"] && "string" === typeof conf["title"]) {
                txt = conf["title"];
                label = self.createStatusLabel(txt);
            } else if (conf["title"] && "function" === typeof conf["title"]) {
                txt = conf["title"](cell);
                if ("object" === typeof txt) {
                    if (txt[1]) {
                        switch (txt[1]) {
                            case "green":
                                label = self.createStatusLabel(txt[0], 'label-green'); break;
                            case "skyblue":
                                label = self.createStatusLabel(txt[0], 'label-skyblue'); break;
                            case "blue":
                                label = self.createStatusLabel(txt[0], 'label-blue'); break;
                            case "orange":
                                label = self.createStatusLabel(txt[0], 'label-orange'); break;
                            case "red":
                                label = self.createStatusLabel(txt[0], 'label-red'); break;
                            default:
                                label = self.createStatusLabel(txt[0]); label.style.backgroundColor = txt[1]; break;
                        }
                    }
                } else {
                    label = self.createStatusLabel(txt);
                }
            }
            return label;
        }
    } else {
        return cell;
    }
}

TABULAR.prototype.setTableHeader = function (config) {
    let hMap = {};
    Object.keys(config["fields"]).forEach(key => {
        hMap[key] = {};
        if (config["fields"][key]) {
            hMap[key]['label'] = config["fields"][key]["label"] ? config["fields"][key]["label"] : (key.toUpperCase() || key);
            hMap[key]['filter'] = config["fields"][key]["filter"] ? config["fields"][key]["filter"] : false;
        }
    });
    if (config["_Labels_"]) {
        hMap["_Labels_"] = {};
        hMap["_Labels_"]["label"] = "Labels";
    }
    if (config["_Actions_"]) {
        hMap["_Actions_"] = {};
        hMap["_Actions_"]["label"] = "Actions";
    }
    return hMap;
}

TABULAR.prototype.setTableHeaderData = function () {
    //Clean the table first
    this.tableEle.innerHTML = '';

    //Stitch Table Headers first
    let head = this.tableEle.createTHead();
    let hRow = head.insertRow(0);
    Object.keys(this.headerMap).forEach(hdr => {
        let hCell = document.createElement("TH");
        hCell.id = hdr;
        hCell.innerText = this.headerMap[hdr]['label'];
        if (this.headerMap[hdr]['filter'])
            hCell.appendChild(this.createFilterDropDown(hdr, this.headerMap[hdr]['filter']));
        hRow.appendChild(hCell);
    });
}

TABULAR.prototype.setTableData = function () {
    let tBody;
    if (_$(this.tbodyId)) {
        _$(this.tbodyId).innerHTML = '';
        tBody = _$(this.tbodyId);
    } else {
        tBody = this.tableEle.appendChild(document.createElement("TBODY"));
        tBody.id = this.tbodyId;
    }

    //Following case is when there is no data to display
    if (!this.getNumberOfRows()) {
        tBody = `<tr><td>No data.</td></tr>`;
        return false;
    }

    //Now stitching data to table
    //Calculate Starting Index
    // this.getCurrentPageInfo(); //Updating Indices
    let outerIndex = this.currentPageInfo.get('startRowIndex');
    let outerIndexLimit = this.currentPageInfo.get('endRowIndex');

    let tRowIndex = 0;
    while (outerIndex <= outerIndexLimit && this.tableData[outerIndex]) {
        let tRow = tBody.insertRow(tRowIndex);
        let innerIndex = 0;
        Object.keys(this.tableData[outerIndex]).forEach(cell => {
            let content = this.tableData[outerIndex][cell];
            if (null === content || !content.nodeType)
                tRow.insertCell(innerIndex).innerHTML = content;
            else {
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
        if (e.target && e.target.value && e.target.classList.contains('paginate_button') && !e.target.classList.contains('disabled')) {
            removeModal();
            self.changePage(e.target);
        }

        /**
         * Handle Modal Close event
         */
        if (e.target && e.target.nodeName === 'BUTTON' && e.target.getAttribute('data-dismiss') === 'modal') {
            removeModal();
        }

        function removeModal() {
            let ele = document.getElementsByClassName('modal');
            if (ele[0]) {
                ele[0].parentNode.removeChild(ele[0]);
            }
        }
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
        }

        /**
         * Handle Filters Change Event
         */
        if (e.target && e.target.value && Object.keys(self.dataFilters).indexOf(e.target.id) > -1) {
            if ('--all--' !== e.target.value)
                self.dataFilters[e.target.id]["keyword"] = e.target.value;
            else
                self.dataFilters[e.target.id]["keyword"] = false;

            self._filter(true);
        } else
            return false;
    });

    /**
     * Handle All KeyUp Events
     */
    this.parentNode.addEventListener("keyup", function (e) {
        if (e.target && e.target.value && '' !== e.target.value && "filter-keyword" === e.target.id) {
        } else
            return false;
    });
};

_$ = function (id) {
    return document.getElementById(id);
};