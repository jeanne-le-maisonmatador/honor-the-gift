

class CollectionFilters extends HTMLElement {
  constructor() {
    super();

    this.style.opacity = 0;
    this.totalProducts = []; 
    this.totalSortedProducts = []; 
    this.getProductsFromJson(); 


    this.tags = []; 
    this.filterBy = {
      color: [], 
      sizes: [], 
      hide_sold_out: false
    }; 

    if(this.querySelector('[data-activate-filters]')) {
      this.querySelector('[data-activate-filters]').addEventListener('click', (event)=> {
        this.setActiveButton('filter-by'); 
        this.filterProducts(); 
      }); 
    }
  
    if(this.querySelector('[data-clear-filters]')) {
      this.querySelector('[data-clear-filters]').addEventListener('click', this.clearFilters.bind(this)); 
    }

    this.querySelectorAll('[data-filter-toggle]').forEach(toggle => {
        toggle.addEventListener('click', (event)=> {
          if(event.target.getAttribute('aria-expanded') == 'true') {
            this.closeFilterOptions(); 
            return
          }
          this.toggleFilterOption(event); 
        }); 
    });

    if(this.querySelector('[data-sort-options')) {
      this.querySelector('[data-sort-options]').addEventListener('change', this.sortproducts.bind(this)); 
    }
  

    document.addEventListener('click', (event) => {
      var isClickInside = this.contains(event.target);
      if (!isClickInside) {
        this.closeFilterOptions(); 
      }
    });


  }

  clearActiveButton(buttonId) {
    this.querySelector(`[data-filter-toggle]#` + `${buttonId}`).classList.remove('is-active'); 
  }
  
  setActiveButton(buttonId) {
    this.querySelector(`[data-filter-toggle]#` + `${buttonId}`).classList.add('is-active'); 
  }

  toggleFilterOption(pFilterToOpen) {

    let filterToOpenId = pFilterToOpen.target.id; 

    this.querySelectorAll('[data-filter-toggle]').forEach(toggle => {
      toggle.setAttribute('aria-expanded', false);
      if(toggle.id === filterToOpenId) {
        toggle.setAttribute('aria-expanded', true); 
      }
    });

    this.querySelectorAll('[data-filter-form]').forEach(form => {
      form.setAttribute('aria-hidden', true);
      if(form.getAttribute('aria-labelledby') === filterToOpenId) {
        form.setAttribute('aria-hidden', false); 
      }
    });

  }

  closeFilterOptions() {
    this.querySelectorAll('[data-filter-form]').forEach(form => {
      form.setAttribute('aria-hidden', true);
    });

    this.querySelectorAll('[data-filter-toggle]').forEach(form => {
      form.setAttribute('aria-expanded', false);
    });
  
    // this.querySelectorAll('[data-sort-toggle]').forEach(form => {
    //   form.setAttribute('aria-expanded', false);
    // });
  }

  sortproducts(pProductsArray, pSortBy) {

    this.setActiveButton('sort-by');

    let sortingType = event.target.value
    const url = `${window.location.pathname}?sort_by=${sortingType}&?section_id=main-collection-product-grid`;
    const queryUrl = new URL(window.location.href); 
    let params = new URLSearchParams(url.search); 


    params.delete('page_num');
    queryUrl.search = `?sort_by=${sortingType}` + params; 

    window.history.replaceState(null, null, queryUrl); 

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          this.close();
          throw error;
        }
        return response.text();
      })
      .then((text) => {
        const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('collection-grid');
        let orderedArray  = []; 
        
        resultsMarkup.querySelectorAll('[data-product-json]').forEach((element)=> {
          orderedArray.push(JSON.parse(element.textContent))
        });
        
        document.querySelector('collection-grid').renderFilteredProducts([], orderedArray, true);
        this.closeFilterOptions();
      })
      .catch((error) => {
        this.closeFilterOptions();
        throw error;
      });
  }
  
  getProductsFromJson() {
    this.totalProducts = JSON.parse(document.querySelector('#product-data').textContent.trim()).products;

    this.pullColorFilters(); 
    this.pullSizeFilters(); 
    this.renderFilters(); 
  }

  pullColorFilters() {
    let tags = []; 
    this.totalProducts.forEach(prod => {
      tags = [...tags, ...prod.tags]; 
    });
    let filtersOnly = tags.filter(tag => tag.indexOf('filter-color:') >= 0);    
    this.colorFilters = _.uniq(filtersOnly);
  }

  pullSizeFilters() {
    let sizeVariants = []; 
    let sizes = []; 

    this.totalProducts.forEach(prod => {
      sizeVariants = [...sizeVariants, ...prod.variants]; 
    });

    sizeVariants.forEach(variant => {
      if(variant.option1) {
        sizes.push(variant.option1); 
      }
    });

    this.sizeFilters = _.uniq(sizes);
  } 

  renderFilters() {
    const colorFilterContainer = '[data-color-filters]'; 
    const sizeFilterContainer = '[data-size-filters]'; 

    this.colorFilters.forEach(color => {
        this.querySelector(colorFilterContainer).insertAdjacentHTML( 'beforeend', `
        <div class="filter-color" data-color="${color}">
        <input type="checkbox" 
        id="${color}"
        name="color" 
        form="filter-sort-form"
        value="${color}"
        class="filter-color__input"
        data-filter
        data-color-filter
        >
        <label class="filter-color__label" for="${color}">
          <span class="visually-hidden">${color.replace('filter-color:', "")}</span>
          <div class="filter-color__label__swatch" data-color="${color}">
          </div>
        </label> 
      </div>`);
    }); 

    if(this.colorFilters.length === 0) {
      this.querySelector('[data-filter-id="color"]').style.display = 'none'; 
    }

    this.sizeFilters.forEach(size => {
      this.querySelector(sizeFilterContainer).insertAdjacentHTML( 'beforeend', `

      <div class="filter-size">
        <input type="checkbox" 
        id="${size}"
        name="size" 
        form="filter-sort-form"
        value="${size}"
        class="quick-add-color-picker__input"
        data-filter
        data-size-filter
        >
        <label class="filter-size__label" for="${size}">
        <div class="filter-size__label__box">
          ${size}
        </div>
      </label> 
      </div>
        `);
    })

    this.style.opacity = 1;

  }

  filterProducts() {
    let products = this.totalProducts;
    let filteredList = []; 
    let filterId = '[data-filter]'
    this.filterBy = {
      color: [], 
      sizes: [], 
      hide_sold_out: false
    }; 

    this.closeFilterOptions(); 

    if( this.querySelectorAll(filterId + ':checked').length <= 0) {
        return
    }

    if(this.querySelectorAll('[data-color-filter]' + ':checked').length > 0) {
      this.querySelectorAll('[data-color-filter]' + ':checked').forEach(color=> {
        this.filterBy.color.push(color.value); 
      });

      const url = new URL(window.location.href); 
      let params = new URLSearchParams(url.search); 
      params.delete('color'); 
      params.delete('page_num');

      this.filterBy.color.forEach(color => {
        params.append('color', color.replace('filter-color:', ""));
      });

      url.search = "?" + params; 

      window.history.replaceState(null, null, url); 

      products = products.filter((product) => {
        for(var i = 0; i < this.filterBy.color.length; i++) {
          if(product.tags.indexOf(this.filterBy.color[i]) > -1) {
            return true
          }
        }
        return false 
      });
      
    }


    if(this.querySelectorAll('[data-size-filter]' + ':checked').length > 0) {
      
      this.querySelectorAll('[data-size-filter]' + ':checked').forEach(color=> {
        this.filterBy.sizes.push(color.value); 
      });

      const url = new URL(window.location.href); 
      let params = new URLSearchParams(url.search); 
      params.delete('sizes'); 

      this.filterBy.sizes.forEach(sizes => {
        params.append('sizes', sizes);
      });

      url.search = "?" + params; 

      window.history.replaceState(null, null, url); 


      
      products = products.filter((product) => {
        for(var i = 0; i < this.filterBy.sizes.length; i++) {
          if(getProductVariantsOptions(product).indexOf(this.filterBy.sizes[i]) > -1) {
            return true
          }
        }
        return false 
      });

    }

    document.querySelector('collection-grid').renderFilteredProducts(products); 

    function getProductVariantsOptions(pProduct) {
      let options = []; 
      pProduct.variants.forEach(variant => {
        if(variant.available !== false) {
          options = [...options, ...variant.options];
        }
      });
      return options; 
    }



  }

  clearFilters() {
    this.closeFilterOptions(); 
    this.clearActiveButton('filter-by'); 

    this.filterBy = {
      color: [], 
      sizes: [], 
      hide_sold_out: false
    }; 
    let filterId = '[data-filter]'

    this.querySelectorAll(filterId + ':checked').forEach(elem => {
      elem.checked = false; 
    });


    const url = new URL(window.location.href); 
    let params = new URLSearchParams(url.search); 
    params.delete('color');
    params.delete('sizes'); 

    url.search = "?" + params; 

    window.history.replaceState(null, null, url); 

    document.querySelector('collection-grid').resetCollectionGrid()
  }
}


customElements.define('collection-filters', CollectionFilters); 

class CollectionGrid extends HTMLElement {
  constructor() {
      super(); 
      this.totalProducts = [];
      this.totalFilteredProducts = [];
      this.totalProductsShowing = [];
      this.section = 1; 
      this.paginateBy = this.dataset.paginateBy;
      this.pagesLoadedCache = []; 
      this.getProductsFromJson(this.dataset.paginateBy); 
      this.setUpPagination(this.totalProductsShowing.length); 
      window.history.replaceState(null, null, null);
  }

  returnTemplateForProduct(pJson) {
    return template; 
  }

  getTotalPages() {
    return  Math.round(this.totalProducts.length / this.paginateBy); 
  }

  getProductsFromJson(pNumToStartFrom) {

    console.log(pNumToStartFrom); 

    const productContainerId = '[data-product-json]';
    const queryString = window.location.search; 
    let startFromProduct = pNumToStartFrom;
    let productsToShow = this.paginateBy;
    let pageNum = 1;  
    
    if(queryString) {
      let urlParams = new URLSearchParams(queryString);
      if(parseInt(urlParams.get('page_num')) > 1) {
        this.querySelector('.product-grid-container').classList.add('is-loading'); 
        pageNum = parseInt(urlParams.get('page_num'));
        this.section = pageNum;
        productsToShow = this.dataset.paginateBy * pageNum;
        this.loadAndRenderProducts(2);
      }

    }
    
    this.totalProducts = JSON.parse(document.querySelector('#product-data').textContent.trim()).products;
    this.totalProductsShowing = this.totalProducts.slice(0, productsToShow);
        

    if(this.totalProducts.length > this.totalProductsShowing.length) {
      this.preLoadProducts(2); 
    }

    this.cachePageLoaded(1, document.querySelector('collection-grid')); 

  }

  setUpPagination(pNumToStartFrom, pFiltered) {
    // const url = new URL(window.location.href); 
    // let params = new URLSearchParams(url.search); 
    // params.delete('page_num');
    // url.search = params; 

    let indexToStartFrom = parseInt(pNumToStartFrom); 

    window.history.replaceState(null, null, null); 

    if(pFiltered) {
      if(this.totalFilteredProducts.length>= parseInt(this.dataset.paginateBy)) {
        document.querySelector('load-more-products-button').style.display = 'none';
      }

      if(this.totalFilteredProducts.length <= indexToStartFrom) {
        document.querySelector('load-more-products-button').style.display = 'none';
      }
    } else {

      let productsToHide = this.querySelectorAll(`.grid__item:nth-child(${indexToStartFrom}) ~ *`);

      this.querySelectorAll('.grid__item').forEach(elem => {
        elem.style.display = 'block';
      });

      productsToHide.forEach(elem => {
        elem.style.display = 'none';
      });

      if(this.totalProducts.length <= indexToStartFrom) {
        document.querySelector('load-more-products-button').style.display = 'none';
      }
    }
  } 


  loadAndRenderProducts(pPage_num) {
      let pageNumToPrerender = pPage_num;
      let urlParams = new URLSearchParams(window.location.search);
  
      if(pageNumToPrerender === 1) {
        return
      }
      const url = `${window.location.pathname}?page=${pageNumToPrerender}&?section_id=main-collection-product-grid`;
  
      this.nextPageMarkup = null; 
      
      if(this.getPageFromCache(pPage_num)) {

        let collectionProductsContainer = this.querySelector('ul'); 


        this.getPageFromCache(pPage_num).markUp.querySelectorAll('.grid__item[data-product-id]').forEach((element, index)=> {
          collectionProductsContainer.appendChild(element); 
          
          if(index === 1) {
            console.log('SCROLL NOW');
              const offsetTop = element.offsetTop - 200;
              scroll({
                top: offsetTop,
                behavior: "smooth"
              });
          }
        });


        if(pageNumToPrerender ===  parseInt(urlParams.get('page_num'))) {
            this.querySelector('.product-grid-container').classList.remove('is-loading'); 
            return
        }

        this.loadAndRenderProducts(pageNumToPrerender + 1)
      }

      fetch(url).then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          this.close();
          throw error;
        }
        return response.text();
      })
      .then((text) => {
        const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('collection-grid');
        //this.cachePageLoaded(pageNumToPrerender, resultsMarkup); 

        let collectionProductsContainer = this.querySelector('ul'); 

        console.log(pPage_num); 

        resultsMarkup.querySelectorAll('.grid__item[data-product-id]').forEach((element, index)=> {
          collectionProductsContainer.appendChild(element); 
          
          if(index === 1) {
            console.log('SCROLL NOW');
              const offsetTop = element.offsetTop - 200;
              scroll({
                top: offsetTop,
                behavior: "smooth"
              });
          }
        });


        if(pageNumToPrerender ===  parseInt(urlParams.get('page_num'))) {
            this.querySelector('.product-grid-container').classList.remove('is-loading'); 
            return
        }

        this.loadAndRenderProducts(pageNumToPrerender + 1)

      })
      .catch((error) => {
        console.log(error); 
        throw error;
      });

  }


  preLoadProducts(pPage_num, pSkipInitPage) {
    let pageNumToPrerender = pPage_num;

    if(pageNumToPrerender === 1) {
      pageNumToPrerender += 1
    }

    const url = `${window.location.pathname}?page=${pageNumToPrerender}&?section_id=main-collection-product-grid`;

    this.nextPageMarkup = null; 
    
    fetch(url)
    .then((response) => {
      if (!response.ok) {
        var error = new Error(response.status);
        this.close();
        throw error;
      }
      return response.text();
    })
    .then((text) => {
      const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('collection-grid');
      this.cachePageLoaded(pageNumToPrerender, resultsMarkup); 

      this.nextPageMarkup = resultsMarkup; 

      if(pageNumToPrerender < this.getTotalPages()) {
        this.preLoadProducts(pageNumToPrerender + 1); 
      }

    })
    .catch((error) => {
      console.log(error); 
      throw error;
    });

  }

  cachePageLoaded(pPage_num, pMarkup) {

    let page = {
      pageNum: pPage_num, 
      markUp: pMarkup
    }; 

    this.pagesLoadedCache.push(page); 
    this.pagesLoadedCache = _.uniq(this.pagesLoadedCache); 
    console.log('CACHED PAGES ARE:')
    console.log(this.pagesLoadedCache); 
  }

  getPageFromCache(pPage_num) {
    let page = undefined; 
    page = _.filter(this.pagesLoadedCache, {'pageNum': pPage_num})
    return page.length > 0 ? page : false;
  }

  renderMoreProducts(pNumToShowMore) {

    window.history.replaceState({page: this.section}, '', '?page_num=' + (this.section += 1));
    const url = `${window.location.pathname}?page=${this.section}&?section_id=main-collection-product-grid`;
    // const queryUrl = new URL(window.location.href); 

    // params.delete('page_num');
    // // queryUrl.search = `?sort_by=${sortingType}`; 

    let collectionProductsContainer = this.querySelector('ul'); 

    console.log('getting page returns: ');
    console.log(this.getPageFromCache(this.section));
    
    if(!this.getPageFromCache(this.section)) {

      document.querySelector('load-more-products-button').showLoadState(); 

      fetch(url)
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          this.close();
          throw error;
        }
        return response.text();
      })
      .then((text) => {
        const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('collection-grid');

        this.cachePageLoaded(this.section, resultsMarkup); 

        resultsMarkup.querySelectorAll('.grid__item[data-product-id]').forEach((element)=> {
          collectionProductsContainer.appendChild(element); 
        });

        document.querySelector('load-more-products-button').updateButton(); 
        document.querySelector('load-more-products-button').hideLoadState(); 
        // document.querySelector('collection-grid').renderFilteredProducts([], orderedArray, true);
        // this.closeFilterOptions();
      })
      .catch((error) => {
        console.log(error); 
        throw error;
      });

    } else {
      
      document.querySelector('load-more-products-button').showLoadState(); 

      let sectionToLoad = this.getPageFromCache(this.section);

      setTimeout(()=> {
        document.querySelector('load-more-products-button').hideLoadState(); 
        sectionToLoad[0].markUp.querySelectorAll('.grid__item[data-product-id]').forEach((element)=> {
          collectionProductsContainer.appendChild(element); 
        });
      }, 200); 

      // this.preLoadProducts(this.section + 1);  
    }

    this.totalProductsShowing = this.totalProducts.slice(0, this.section * this.paginateBy); 
    document.querySelector('load-more-products-button').updateButton(); 

    console.log(this.totalProductsShowing); 

    //  let productsToAdd = this.totalProducts.slice(this.totalProductsShowing.length, this.totalProductsShowing.length + pNumToShowMore);
    //  this.totalProductsShowing = [...this.totalProductsShowing, ...productsToAdd]
    //  this.totalProductsShowing.forEach((productJSON)=> {
    //     this.querySelector(`.grid__item[data-product-id="${productJSON.id}"]`).style.display = 'block';
    //  });

  }


  renderFilteredProducts(pProductsToShow, pOrderArray, pSorting) {

    let products = this.querySelectorAll(`.grid__item`);

    if(pSorting && pProductsToShow.length === 0) {
      let idOrders =  []
      let productsToShow = this.totalFilteredProducts.length  > 0 ? this.totalFilteredProducts : false  || pOrderArray

      productsToShow.forEach((elem) => { 
        idOrders.push(parseInt(elem.id)); 
      }); 

      this.totalProducts = pOrderArray; 

      let sortedProducts = _.sortBy(products, function(item){
        return idOrders.indexOf(parseInt(item.dataset.productId)); 
      });

      this.totalProductsShowing = this.totalProducts.slice(0, this.paginateBy);

      sortedProducts.forEach(el => {
          el.parentNode.appendChild(el);
      });
      
      this.setUpPagination(this.dataset.paginateBy, false); 

    } else {

      this.totalFilteredProducts = pProductsToShow; 
      this.totalProductsShowing = pProductsToShow.slice(0, this.paginateBy);

      if(this.totalProducts) {
        
        let idOrders  = [];

        this.totalProducts.forEach((elem) => { 
          idOrders.push(parseInt(elem.id)); 
        }); 

        this.totalFilteredProducts = _.sortBy(this.totalFilteredProducts, function(item) {
            return idOrders.indexOf(item.id)
        });   
      }
      

        products.forEach(product => {
          product.style.display = 'none';
        });
      
        products.forEach(product => {

          if(this.totalFilteredProducts.some(e => e.id == parseInt(product.dataset.productId))) {
              product.style.display = 'block'; 
            } else {
              product.style.display = 'none'; 
            }
        }); 

      this.setUpPagination(this.dataset.paginateBy, true); 


    }


  }

  getTotalProducts() {
    return this.totalProducts; 
  } 
  getProductsRendered() {
    return this.totalProductsShowing; 
  } 

  resetCollectionGrid() {
    this.totalFilteredProducts = []; 
    this.section = 1;
    this.totalProductsShowing = this.totalProducts.slice(0, this.paginateBy);

    let products = this.querySelectorAll(`.grid__item`);

    products.forEach(product => {
      product.style.display = 'block'; 
    });

    this.setUpPagination(this.totalProductsShowing.length); 
    document.querySelector('load-more-products-button').reset(); 
  }
}


customElements.define('collection-grid', CollectionGrid); 