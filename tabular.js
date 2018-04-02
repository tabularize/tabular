function TABULAR(id){
    this.eleId = id;
    this.tableEle = document.getElementById(id);
    this.tableEle.classList.add("tabular"); //Added class to table tag
    this.parentNode = this.tableEle.parentNode;
    this.tableHeadNode , this.tableFootNode;
    this.numOfRows , this.numOfColumns;
    this.headerMap = new Map();
    this.tableData = {};
    this.rowLimitOps = [15, 30, 50, 100];
    this.rowsPerPage = 15; //default
    this.currentPage = 1; //Default - required for pagination
    this.totalPages = this.getTotalNumberOfPages(); // required for pagination
    this.currentPageInfo = new Map();
    this.paginationFlag = true;
    this.sortIndex = 0; //Default
    this.sortSeq = "asc"; //default
    this.filterKeyword = '';

    this._init();
}

TABULAR.prototype._init = function (update = false) {
    if(update)
        this.currentPage = 1;
    else {
        this.getNumberOfRows();
        this.getNumberOfColumns();
        this.getTableData();
        /**
         * Initialize Listeners
         */
        this.initializeListeners(this);
    }
    /**
     * Setting current page info
     */
    this.getCurrentPageInfo();

    /**
     * Making DOM modifications to table
     */
    if(update)
        this.addDOMFootProperties();
    else {
        this.addDOMHeadProperties();
        this.addDOMFootProperties();
    }

    /**
     * Setting Table Data
     */
    this.setTableData();

    /**
     * Checking and Showing Pagination
     */
    if(this.getTotalNumberOfPages() > 1){
        this.tableFootNode.appendChild(this.getPaginationHtml());
    }
}

TABULAR.prototype.addDOMHeadProperties = function () {
    this.parentNode.insertBefore(this.attachTableTopDiv(), this.parentNode.firstChild);
    this.parentNode.appendChild(this.attachTableBottomDiv());
    this.tableHeadNode = document.getElementById('table-head');
}

TABULAR.prototype.addDOMFootProperties = function () {
    if(document.getElementById('table-foot'))
        document.getElementById('table-foot').innerHTML = '';
    this.parentNode.appendChild(this.attachTableBottomDiv());
    this.tableFootNode = document.getElementById('table-foot');
}

TABULAR.prototype.attachTableTopDiv = function () {
    let divEle = '';
    if(document.getElementById('table-head')){
        divEle = document.getElementById('table-head');
        divEle.innerHTML = '';
    } else {
        divEle = document.createElement("DIV");
        divEle.id = "table-head";
    }
    //Attaching the Rows per Page DropDown
    divEle.appendChild(this.createNumRowsDropDown());
    // divEle.appendChild(this.createSearchInput());
    return divEle;
}

TABULAR.prototype.attachTableBottomDiv = function () {
    let divEle = '';
    if(document.getElementById('table-foot')){
        divEle = document.getElementById('table-foot');
        divEle.innerHTML = '';
    } else {
        divEle = document.createElement("DIV");
        divEle.id = "table-foot";
    }
    //Attaching the Rows per Page DropDown
    divEle.appendChild(this.createPageInfoSpan());
    return divEle;
}

TABULAR.prototype.createNumRowsDropDown = function () {
    let dd = [];
    dd[0] = document.createElement("LABEL");
    dd[0].innerHTML = "Rows per page:";
    dd[1] = document.createElement("SELECT");
    dd[1].id = "row-limit";
    this.rowLimitOps.forEach(n => {
        let op = new Option();
        op.value = n;
        op.text = n;
        dd[1].options.add(op);
    });
    //Using function 'pushElementsInsideDiv' to put label and select inside one div
    return this.pushElementsInsideDiv(dd);
}

/**
 * @param ele : array of elements to be pushed inside a div
 * @return {*} : the div element is returned containing the array elements as its children
 */
TABULAR.prototype.pushElementsInsideDiv = function (ele) {
    // console.log(ele);
    let divEle = document.createElement("DIV");
    for(let i of ele)
        divEle.appendChild(i);
    return divEle;
}

TABULAR.prototype.createPageInfoSpan = function () {
    let pgSpan = '';
    //clear span if any
    if(document.getElementById('page-info'))
        pgSpan = document.getElementById('page-info');
    else{
        pgSpan = document.createElement("SPAN");
        pgSpan.id = "page-info";
    }
    pgSpan.innerHTML = ``;
    pgSpan.innerHTML = `Showing ${this.currentPageInfo.get('startRow')} to ${this.currentPageInfo.get('endRow')} of ${this.numOfRows} entries`;
    return pgSpan;
}

TABULAR.prototype.updatePageInfoSpan = function () {
    let pgSpan = '';
    //clear span if any
    if(document.getElementById('page-info')){
        pgSpan = document.getElementById('page-info');
        pgSpan.innerHTML = ``;
        pgSpan.innerHTML = `Showing ${this.getCurrentPageInfo().get('startRow')} to ${this.getCurrentPageInfo().get('endRow')} of ${this.numOfRows} entries`;
    }
}

TABULAR.prototype.createSearchInput = function () {
    let searchInput = document.createElement("INPUT");
    searchInput.id = "filter-keyword";
    searchInput.placeholder = "Search";
    return searchInput;
}

TABULAR.prototype.getNumberOfRows = function(){
    this.numOfRows = this.tableEle.rows.length - 1; //-1 to remove header row in count
    return this.numOfRows;
}

TABULAR.prototype.getNumberOfColumns = function(){
    this.numOfColumns = this.tableEle.rows.item(0).cells.length;
    return this.numOfColumns;
}

TABULAR.prototype.getTotalNumberOfPages = function () {
    this.totalPages = Math.ceil(this.numOfRows / this.rowsPerPage);
    return this.totalPages;
}

TABULAR.prototype.getCurrentPageInfo = function () {
    let startRow = this.rowsPerPage * (this.currentPage-1) + 1;
    let endRow = this.rowsPerPage * (this.currentPage-1) + this.rowsPerPage;
    if(endRow > this.numOfRows)
        endRow = this.numOfRows;
    this.currentPageInfo.set('startRow', startRow);
    this.currentPageInfo.set('endRow', endRow);
    this.currentPageInfo.set('startRowIndex', startRow-1);
    this.currentPageInfo.set('endRowIndex', endRow-1);
    return this.currentPageInfo;
}

TABULAR.prototype.updatePageInfo = function () {
    this.getTotalNumberOfPages();
    this.getCurrentPageInfo();
    this.updatePageInfoSpan();
}

TABULAR.prototype.getTableData = function () {
    /**
     * Getting headers first from <th>
     */
    let headerRow = this.tableEle.rows.item(0).cells;
    let headIndex = 0;
    while(headIndex < headerRow.length){
        let val = headerRow.item(headIndex).innerHTML;
        this.headerMap.set(headIndex, [val.toLowerCase().replace(/\s/, '-'), val]);
        headIndex++;
    }
    let startIndex = 0;
    let data = [];
    while(startIndex < this.numOfRows){
        data[startIndex] = [];
        let singleRow = this.tableEle.rows.item(startIndex+1).cells;
        let numOfCols = singleRow.length;
        let colIndex = 0;
        while(numOfCols > colIndex){
            data[startIndex].push(singleRow.item(colIndex).innerHTML);
            colIndex++;
        }
        startIndex++;
    }
    this.tableData = data;
    // console.log(this.headerMap, this.tableData);
}

TABULAR.prototype.setTableData = function(){
    //Clean the table first
    this.tableEle.innerHTML = '';

    //Stitch Table Headers first
    let head = this.tableEle.createTHead();
    let hRow = head.insertRow(0);
    for(let [key, value] of this.headerMap){
        let hCell = document.createElement("TH");
        hCell.innerHTML = value[1];
        hRow.appendChild(hCell);
    }

    this.getCurrentPageInfo();
    //Now stitching data to table
    //Calculate Starting Index
    let outerIndex = this.currentPageInfo.get('startRowIndex');
    let outerIndexLimit = this.currentPageInfo.get('endRowIndex');
    let tBody = this.tableEle.appendChild(document.createElement("TBODY"));
    let tRowIndex = 0;
    while(outerIndex <= outerIndexLimit){
        let tRow = tBody.insertRow(tRowIndex);
        let innerIndex = 0;
        while(innerIndex < this.tableData[outerIndex].length){
            tRow.insertCell(innerIndex).innerHTML = this.tableData[outerIndex][innerIndex];
            innerIndex++;
        }
        tRowIndex++;
        outerIndex++;
    }

    this.createPageInfoSpan();
}

TABULAR.prototype.changePage = function (tgtPage) {
    if('NEXT' === tgtPage.value){
        this.currentPage = this.currentPage+1;
    } else if('PREV' === tgtPage.value) {
        this.currentPage = this.currentPage-1;
    } else {
        this.currentPage = parseInt(tgtPage.value);
    }
    this.getCurrentPageInfo();
    this.setTableData();
    this.modifyPagination();
}
/**
 * PAGINATION
 */
TABULAR.prototype.paginStart = 1;
TABULAR.prototype.paginEnd = 5;
TABULAR.prototype.getPaginationHtml = function (shift = false) {
    let paginHtml = [];
    let btnCount = this.paginStart;
    while(btnCount <= this.paginEnd && btnCount <= this.getTotalNumberOfPages()){
        let aTag = document.createElement("A");
        aTag.value = btnCount;
        aTag.text = btnCount;
        aTag.classList.add('paginate_button');
        if(this.currentPage === btnCount)
            aTag.classList.add('current');
        paginHtml.push(aTag);
        btnCount++;
    }

    let div1 = '';
    if(shift && document.getElementById('pagination')){
        div1 = document.getElementById('pagination');
        div1.innerHTML = "";
    } else {
        div1 = document.createElement("DIV");
        div1.id = "pagination";
        div1.classList.add("pagination");
    }
    let aN = document.createElement("A");
    aN.value = "NEXT";
    aN.text = "Next";
    aN.classList.add('paginate_button');
    if(this.getTotalNumberOfPages() === this.currentPage)
        aN.classList.add('disabled');

    let aP = document.createElement("A");
    aP.value = "PREV";
    aP.text = "Previous";
    aP.classList.add('paginate_button');
    if(1 === this.currentPage)
        aP.classList.add('disabled');

    div1.appendChild(aP);
    for(let t of paginHtml)
        div1.appendChild(t);
    div1.appendChild(aN);

    return div1;
}

TABULAR.prototype.modifyPagination = function () {
    if((this.paginEnd - this.currentPage === 0) && this.getTotalNumberOfPages() !== this.currentPage){
        this.paginEnd++;
        this.paginStart++;
    } else if((this.currentPage - this.paginStart === 0) && 1 !== this.currentPage){
        this.paginEnd--;
        this.paginStart--;
    }
    this.tableFootNode.appendChild(this.getPaginationHtml(true));
}

TABULAR.prototype.initializeListeners = function () {
    let self = this;
    /**
     * Handle All Click Events
     */
    this.parentNode.addEventListener("click", function(e) {
        /**
         * Handle Pagination Click Events Below
         */
        if(e.target && e.target.value && e.target.classList.contains('paginate_button') && !e.target.classList.contains('disabled'))
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
    this.parentNode.addEventListener("change", function(e) {
        /**
         * Handle Row-Limit Change Event
         */
        if(e.target && e.target.value && "row-limit" === e.target.id){
            self.rowsPerPage = e.target.value;
            self._init(true);
        } else
            return false;
    });

    /**
     * Handle All KeyUp Events
     */
    this.parentNode.addEventListener("keyup", function(e) {
        if(e.target && e.target.value && '' !== e.target.value && "filter-keyword" === e.target.id){
            console.log(e.target.value);
        } else
            return false;
    });
}
