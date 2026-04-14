<%- include('partials/header') %>

<%
// Helper function to format currency
function formatNaira(amount) {
    return '₦' + parseFloat(amount).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// Check if property is shortlet
const isShortlet = property.propertyType === 'shortlet';
%>

<!-- Page Top -->
<section>
    <div class="w-100 pt-180 pb-110 black-layer opc45 position-relative">
        <div class="fixed-bg" style="background-image: url(/assets/images/pg-tp-bg.jpg);"></div>
        <div class="container">
            <div class="pg-tp-wrp text-center w-100">
                <h1 class="mb-0"><%= property.title %></h1>
                <ol class="breadcrumb">
                    <li class="breadcrumb-item"><a href="/" title="Home">Home</a></li>
                    <li class="breadcrumb-item"><a href="/properties" title="Properties">Properties</a></li>
                    <li class="breadcrumb-item active">Property Details</li>
                </ol>
            </div>
        </div>
    </div>
</section>

<!-- Property Detail Section -->
<section>
    <div class="w-100 pt-120 pb-90 position-relative">
        <div class="container">
            <div class="row">
                <div class="col-lg-8">
                    <!-- Property Gallery -->
                    <div class="property-gallery mb-4">
                        <% if (property.images && property.images.length > 0) { %>
                            <div class="property-gallery-main">
                                <% property.images.forEach((image, index) => { %>
                                    <div class="gallery-item">
                                        <a href="<%= image.url %>" data-fancybox="gallery">
                                            <img src="<%= image.url %>" alt="<%= property.title %>" class="img-fluid w-100" style="height: 400px; object-fit: cover;">
                                        </a>
                                    </div>
                                <% }); %>
                            </div>
                            <% if (property.images.length > 1) { %>
                                <div class="property-gallery-thumbs mt-3">
                                    <div class="row">
                                        <% property.images.slice(0, 4).forEach((image, index) => { %>
                                            <div class="col-3">
                                                <img src="<%= image.url %>" alt="Thumbnail" class="img-fluid cursor-pointer rounded" 
                                                     style="height: 80px; width: 100%; object-fit: cover;"
                                                     onclick="$('.property-gallery-main').slick('slickGoTo', <%= index %>)">
                                            </div>
                                        <% }); %>
                                    </div>
                                </div>
                            <% } %>
                        <% } else { %>
                            <img src="/assets/images/default-property.jpg" alt="No Image" class="img-fluid w-100" style="height: 400px; object-fit: cover;">
                        <% } %>
                    </div>

                    <!-- Property Title & Actions -->
                    <div class="property-header d-flex flex-wrap justify-content-between align-items-start mb-4">
                        <div>
                            <h2><%= property.title %></h2>
                            <p class="text-muted">
                                <i class="fas fa-map-marker-alt thm-clr"></i> 
                                <%= property.location.address %>, <%= property.location.city %>, <%= property.location.state %>
                            </p>
                        </div>
                        <div class="property-actions mt-3 mt-md-0">
                            <button class="btn btn-outline-danger mr-2" onclick="toggleFavorite('<%= property._id %>')">
                                <i class="far fa-heart"></i> Save
                            </button>
                            <button class="btn btn-outline-primary" onclick="shareProperty()">
                                <i class="fas fa-share-alt"></i> Share
                            </button>
                        </div>
                    </div>

                    <!-- Property Badges -->
                    <div class="property-badges mb-4">
                        <span class="badge badge-primary p-2 mr-2"><%= property.propertyType.replace('_', ' ') %></span>
                        <span class="badge badge-<%= property.transactionType === 'sale' ? 'success' : (property.transactionType === 'rent' ? 'info' : 'warning') %> p-2 mr-2">
                            For <%= property.transactionType %>
                        </span>
                        <% if (property.featured) { %>
                            <span class="badge badge-warning p-2 mr-2"><i class="fas fa-star"></i> Featured</span>
                        <% } %>
                        <% if (property.listingTier === 'premium') { %>
                            <span class="badge badge-warning p-2"><i class="fas fa-crown"></i> Premium Listing</span>
                        <% } else if (property.listingTier === 'standard') { %>
                            <span class="badge badge-info p-2"><i class="fas fa-star"></i> Featured Listing</span>
                        <% } %>
                    </div>

                    <!-- Price -->
                    <div class="property-price mb-4 p-4 bg-light rounded">
                        <h3 class="mb-0"><%= formatNaira(property.price) %></h3>
                        <% if (property.transactionType === 'rent') { %>
                            <p class="mb-0 text-muted">per year</p>
                        <% } else if (property.transactionType === 'lease') { %>
                            <p class="mb-0 text-muted">leasehold</p>
                        <% } %>
                        <% if (property.priceNegotiable) { %>
                            <span class="badge badge-success mt-2"><i class="fas fa-handshake"></i> Price Negotiable</span>
                        <% } %>
                    </div>

                    <!-- Key Features -->
                    <div class="property-features mb-4">
                        <h4>Key Features</h4>
                        <div class="row">
                            <% if (property.features.bedrooms) { %>
                                <div class="col-6 col-md-3 mb-3">
                                    <div class="feature-item text-center p-3 border rounded">
                                        <i class="fas fa-bed fa-2x thm-clr mb-2"></i>
                                        <h6 class="mb-0"><%= property.features.bedrooms %> Bedrooms</h6>
                                    </div>
                                </div>
                            <% } %>
                            <% if (property.features.bathrooms) { %>
                                <div class="col-6 col-md-3 mb-3">
                                    <div class="feature-item text-center p-3 border rounded">
                                        <i class="fas fa-bath fa-2x thm-clr mb-2"></i>
                                        <h6 class="mb-0"><%= property.features.bathrooms %> Bathrooms</h6>
                                    </div>
                                </div>
                            <% } %>
                            <% if (property.features.toilets) { %>
                                <div class="col-6 col-md-3 mb-3">
                                    <div class="feature-item text-center p-3 border rounded">
                                        <i class="fas fa-toilet fa-2x thm-clr mb-2"></i>
                                        <h6 class="mb-0"><%= property.features.toilets %> Toilets</h6>
                                    </div>
                                </div>
                            <% } %>
                            <% if (property.features.parkingSpaces) { %>
                                <div class="col-6 col-md-3 mb-3">
                                    <div class="feature-item text-center p-3 border rounded">
                                        <i class="fas fa-car fa-2x thm-clr mb-2"></i>
                                        <h6 class="mb-0"><%= property.features.parkingSpaces %> Parking</h6>
                                    </div>
                                </div>
                            <% } %>
                        </div>
                        <div class="row">
                            <% if (property.features.floorArea) { %>
                                <div class="col-6 col-md-3 mb-3">
                                    <div class="feature-item text-center p-3 border rounded">
                                        <i class="fas fa-vector-square fa-2x thm-clr mb-2"></i>
                                        <h6 class="mb-0"><%= property.features.floorArea %> sqm</h6>
                                        <small>Floor Area</small>
                                    </div>
                                </div>
                            <% } %>
                            <% if (property.features.landArea) { %>
                                <div class="col-6 col-md-3 mb-3">
                                    <div class="feature-item text-center p-3 border rounded">
                                        <i class="fas fa-map fa-2x thm-clr mb-2"></i>
                                        <h6 class="mb-0"><%= property.features.landArea %> sqm</h6>
                                        <small>Land Area</small>
                                    </div>
                                </div>
                            <% } %>
                        </div>
                    </div>

                    <!-- Amenities -->
                    <% if (property.features.furnished || property.features.serviced || property.features.security || 
                          property.features.powerSupply || property.features.borehole) { %>
                        <div class="property-amenities mb-4">
                            <h4>Amenities</h4>
                            <div class="row">
                                <% if (property.features.furnished) { %>
                                    <div class="col-6 col-md-4 mb-2">
                                        <i class="fas fa-check-circle text-success"></i> Furnished
                                    </div>
                                <% } %>
                                <% if (property.features.serviced) { %>
                                    <div class="col-6 col-md-4 mb-2">
                                        <i class="fas fa-check-circle text-success"></i> Serviced
                                    </div>
                                <% } %>
                                <% if (property.features.security) { %>
                                    <div class="col-6 col-md-4 mb-2">
                                        <i class="fas fa-check-circle text-success"></i> 24/7 Security
                                    </div>
                                <% } %>
                                <% if (property.features.powerSupply) { %>
                                    <div class="col-6 col-md-4 mb-2">
                                        <i class="fas fa-check-circle text-success"></i> Power Supply
                                    </div>
                                <% } %>
                                <% if (property.features.borehole) { %>
                                    <div class="col-6 col-md-4 mb-2">
                                        <i class="fas fa-check-circle text-success"></i> Borehole
                                    </div>
                                <% } %>
                            </div>
                        </div>
                    <% } %>

                    <!-- Description -->
                    <div class="property-description mb-4">
                        <h4>Description</h4>
                        <p class="text-justify"><%= property.description %></p>
                    </div>

                    <!-- Shortlet Specific Details -->
                    <% if (isShortlet && property.shortletDetails) { %>
                        <div class="shortlet-details mb-4">
                            <h4>Shortlet Information</h4>
                            <div class="row">
                                <div class="col-md-6">
                                    <table class="table table-borderless">
                                        <tr>
                                            <th>Min Stay:</th>
                                            <td><%= property.shortletDetails.minimumStay %> nights</td>
                                        </tr>
                                        <tr>
                                            <th>Max Stay:</th>
                                            <td><%= property.shortletDetails.maximumStay %> nights</td>
                                        </tr>
                                        <tr>
                                            <th>Check-in:</th>
                                            <td><%= property.shortletDetails.checkInTime %></td>
                                        </tr>
                                        <tr>
                                            <th>Check-out:</th>
                                            <td><%= property.shortletDetails.checkOutTime %></td>
                                        </tr>
                                        <tr>
                                            <th>Max Guests:</th>
                                            <td><%= property.shortletDetails.maxGuests %></td>
                                        </tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <% if (property.shortletDetails.amenities && property.shortletDetails.amenities.length > 0) { %>
                                        <h6>Amenities:</h6>
                                        <ul>
                                            <% property.shortletDetails.amenities.forEach(amenity => { %>
                                                <li><i class="fas fa-check text-success"></i> <%= amenity %></li>
                                            <% }); %>
                                        </ul>
                                    <% } %>
                                    <% if (property.shortletDetails.houseRules && property.shortletDetails.houseRules.length > 0) { %>
                                        <h6>House Rules:</h6>
                                        <ul>
                                            <% property.shortletDetails.houseRules.forEach(rule => { %>
                                                <li><i class="fas fa-info-circle text-info"></i> <%= rule %></li>
                                            <% }); %>
                                        </ul>
                                    <% } %>
                                </div>
                            </div>
                            <div class="alert alert-info mt-3">
                                <strong>Cancellation Policy:</strong> <%= property.shortletDetails.cancellationPolicy %>
                                <% if (property.shortletDetails.cleaningFee > 0) { %>
                                    <br><strong>Cleaning Fee:</strong> <%= formatNaira(property.shortletDetails.cleaningFee) %>
                                <% } %>
                                <% if (property.shortletDetails.securityDeposit > 0) { %>
                                    <br><strong>Security Deposit:</strong> <%= formatNaira(property.shortletDetails.securityDeposit) %>
                                <% } %>
                            </div>
                        </div>
                    <% } %>

                    <!-- Location Map -->
                    <div class="property-location mb-4">
                        <h4>Location</h4>
                        <div id="property-map" style="height: 300px; width: 100%; border-radius: 10px;"></div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <!-- Agent/Realtor Info -->
                    <div class="realtor-card p-4 bg-light rounded mb-4">
                        <h5>Listed By</h5>
                        <div class="d-flex align-items-center mb-3">
                            <img src="<%= property.owner?.profileImage ? '/uploads/profiles/' + property.owner.profileImage : '/assets/images/default-avatar.jpg' %>" 
                                 alt="<%= property.owner?.name %>" 
                                 class="rounded-circle mr-3" 
                                 style="width: 60px; height: 60px; object-fit: cover;">
                            <div>
                                <h6 class="mb-1"><%= property.owner?.name %></h6>
                                <p class="mb-0 text-muted">
                                    <% if (property.owner?.realtorProfile?.verified) { %>
                                        <i class="fas fa-check-circle text-success"></i> Verified Realtor
                                    <% } else { %>
                                        <i class="fas fa-clock text-warning"></i> Pending Verification
                                    <% } %>
                                </p>
                            </div>
                        </div>
                        <p class="mb-2"><i class="fas fa-building"></i> <%= property.owner?.realtorProfile?.company || 'Independent Realtor' %></p>
                        <p class="mb-2"><i class="fas fa-phone"></i> <a href="tel:<%= property.owner?.phone %>"><%= property.owner?.phone %></a></p>
                        <p class="mb-2"><i class="fas fa-envelope"></i> <a href="mailto:<%= property.owner?.email %>"><%= property.owner?.email %></a></p>
                    </div>

                    <!-- Inquiry Form -->
                    <div class="inquiry-card p-4 bg-white rounded shadow-sm mb-4">
                        <h5>Interested in this property?</h5>
                        <p class="text-muted">Send an inquiry to the owner</p>
                        
                        <form action="/inquiries" method="POST" id="inquiryForm">
                            <input type="hidden" name="propertyId" value="<%= property._id %>">
                            
                            <div class="form-group">
                                <input type="text" class="form-control" name="name" placeholder="Your Full Name" required>
                            </div>
                            <div class="form-group">
                                <input type="email" class="form-control" name="email" placeholder="Your Email" required>
                            </div>
                            <div class="form-group">
                                <input type="tel" class="form-control" name="phone" placeholder="Your Phone Number" required>
                            </div>
                            <div class="form-group">
                                <textarea class="form-control" name="message" rows="4" placeholder="I'm interested in this property. Please contact me..." required></textarea>
                            </div>
                            <button type="submit" class="thm-btn btn-block">
                                <i class="fas fa-paper-plane"></i> Send Inquiry
                            </button>
                        </form>
                    </div>

                    <!-- Agent Promotion (if user is an agent) -->
                    <% if (currentUser && userType === 'agent') { %>
                        <div class="agent-promo-card p-4 bg-white rounded shadow-sm mb-4">
                            <h5>Promote this Property</h5>
                            <p class="text-muted">Get your unique referral link</p>
                            <button class="btn btn-info btn-block" onclick="getPromotionLink('<%= property._id %>')">
                                <i class="fas fa-link"></i> Generate Referral Link
                            </button>
                            <div id="promotionLink" class="mt-3" style="display: none;">
                                <label>Your Referral Link:</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="referralLink" readonly>
                                    <div class="input-group-append">
                                        <button class="btn btn-primary" onclick="copyReferralLink()">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                                <small class="text-muted">Share this link to earn 70% commission</small>
                            </div>
                        </div>
                    <% } %>

                    <!-- Property Stats -->
                    <div class="stats-card p-4 bg-white rounded shadow-sm">
                        <h5>Property Stats</h5>
                        <ul class="list-unstyled">
                            <li class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-eye"></i> Views</span>
                                <span class="badge badge-primary"><%= property.views || 0 %></span>
                            </li>
                            <li class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-calendar-alt"></i> Listed</span>
                                <span><%= new Date(property.createdAt).toLocaleDateString() %></span>
                            </li>
                            <li class="d-flex justify-content-between mb-2">
                                <span><i class="fas fa-tag"></i> Property ID</span>
                                <span><%= property._id.toString().slice(-6).toUpperCase() %></span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Similar Properties -->
            <% if (similarProperties && similarProperties.length > 0) { %>
                <div class="similar-properties mt-5">
                    <h3 class="mb-4">Similar Properties</h3>
                    <div class="row">
                        <% similarProperties.forEach(prop => { %>
                            <div class="col-md-3">
                                <div class="list-post-box v2 brd-rd5 overflow-hidden w-100">
                                    <div class="list-post-img overflow-hidden position-relative">
                                        <a href="/properties/<%= prop.slug %>">
                                            <img class="img-fluid w-100" src="<%= prop.images && prop.images[0] ? prop.images[0].url : '/assets/images/default-property.jpg' %>" 
                                                 alt="<%= prop.title %>" style="height: 150px; object-fit: cover;">
                                        </a>
                                    </div>
                                    <div class="list-post-info p-3">
                                        <h6 class="mb-1">
                                            <a href="/properties/<%= prop.slug %>"><%= prop.title.substring(0, 30) %>...</a>
                                        </h6>
                                        <p class="mb-0 text-muted"><%= prop.location.city %>, <%= prop.location.state %></p>
                                        <p class="mb-0"><strong><%= formatNaira(prop.price) %></strong></p>
                                    </div>
                                </div>
                            </div>
                        <% }); %>
                    </div>
                </div>
            <% } %>
        </div>
    </div>
</section>

<!-- Share Modal -->
<div class="modal fade" id="shareModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Share this Property</h5>
                <button type="button" class="close" data-dismiss="modal">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <p>Share this property with your network:</p>
                <div class="social-share-buttons text-center">
                    <button class="btn btn-primary m-1" onclick="shareOnFacebook()">
                        <i class="fab fa-facebook"></i> Facebook
                    </button>
                    <button class="btn btn-info m-1" onclick="shareOnTwitter()">
                        <i class="fab fa-twitter"></i> Twitter
                    </button>
                    <button class="btn btn-success m-1" onclick="shareOnWhatsApp()">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                </div>
                <hr>
                <p>Or copy the link:</p>
                <div class="input-group">
                    <input type="text" class="form-control" id="propertyLink" value="<%= req.protocol + '://' + req.get('host') + '/properties/' + property.slug %>" readonly>
                    <div class="input-group-append">
                        <button class="btn btn-primary" onclick="copyPropertyLink()">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.property-gallery-main .gallery-item {
    border-radius: 10px;
    overflow: hidden;
}

.cursor-pointer {
    cursor: pointer;
}

.feature-item {
    transition: all 0.3s ease;
}

.feature-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.realtor-card, .inquiry-card, .agent-promo-card, .stats-card {
    border: 1px solid #f0f0f0;
}

.inquiry-card form input,
.inquiry-card form textarea {
    border: 1px solid #e0e0e0;
    border-radius: 5px;
    padding: 10px 15px;
    font-size: 14px;
}

.inquiry-card form input:focus,
.inquiry-card form textarea:focus {
    border-color: #ff6b6b;
    outline: none;
    box-shadow: 0 0 0 2px rgba(255,107,107,0.1);
}

.social-share-buttons button {
    min-width: 120px;
}

@media (max-width: 768px) {
    .social-share-buttons button {
        width: 100%;
        margin: 5px 0;
    }
}
</style>

<script>
// Initialize gallery
$(document).ready(function() {
    $('.property-gallery-main').slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        fade: true,
        asNavFor: '.property-gallery-thumbs'
    });
    
    $('.property-gallery-thumbs').slick({
        slidesToShow: 4,
        slidesToScroll: 1,
        asNavFor: '.property-gallery-main',
        dots: false,
        arrows: false,
        focusOnSelect: true
    });
});

// Toggle favorite
function toggleFavorite(propertyId) {
    <% if (!currentUser) { %>
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    <% } %>
    
    $.post('/favorites/toggle', { propertyId }, function(data) {
        if (data.favorited) {
            alert('Property added to favorites');
        } else {
            alert('Property removed from favorites');
        }
    }).fail(function() {
        alert('Error toggling favorite');
    });
}

// Share property
function shareProperty() {
    $('#shareModal').modal('show');
}

// Social sharing functions
function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank', 'width=600,height=400');
}

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out this property on Found Properties: <%= property.title %>');
    window.open('https://twitter.com/intent/tweet?text=' + text + '&url=' + url, '_blank', 'width=600,height=400');
}

function shareOnWhatsApp() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out this property on Found Properties: <%= property.title %>');
    window.open('https://wa.me/?text=' + text + '%20' + url, '_blank');
}

function copyPropertyLink() {
    const link = document.getElementById('propertyLink');
    link.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
}

// Get promotion link for agents
function getPromotionLink(propertyId) {
    $.get('/api/promotion/link/' + propertyId, function(data) {
        if (data.link) {
            const fullLink = window.location.origin + data.link;
            document.getElementById('referralLink').value = fullLink;
            document.getElementById('promotionLink').style.display = 'block';
        }
    }).fail(function() {
        alert('Error generating promotion link');
    });
}

function copyReferralLink() {
    const link = document.getElementById('referralLink');
    link.select();
    document.execCommand('copy');
    alert('Referral link copied to clipboard!');
}

// Initialize map
function initMap() {
    const location = { 
        lat: <%= property.location.coordinates?.lat || 6.4281 %>, 
        lng: <%= property.location.coordinates?.lng || 3.4219 %> 
    };
    
    const map = new google.maps.Map(document.getElementById('property-map'), {
        zoom: 15,
        center: location
    });
    
    const marker = new google.maps.Marker({
        position: location,
        map: map,
        title: '<%= property.title %>'
    });
    
    const infowindow = new google.maps.InfoWindow({
        content: '<strong><%= property.title %></strong><br><%= property.location.address %>'
    });
    
    marker.addListener('click', function() {
        infowindow.open(map, marker);
    });
}

// Form validation
document.getElementById('inquiryForm')?.addEventListener('submit', function(e) {
    const phone = document.querySelector('input[name="phone"]').value;
    const phoneRegex = /^(0|\+234)[7-9][0-1]\d{8}$/;
    
    if (!phoneRegex.test(phone)) {
        e.preventDefault();
        alert('Please enter a valid Nigerian phone number (e.g., 08031234567 or +2348031234567)');
        return;
    }
});

// Nigerian phone number formatting
document.querySelector('input[name="phone"]')?.addEventListener('input', function(e) {
    let phone = this.value.replace(/\D/g, '');
    if (phone.length > 11 && !this.value.startsWith('+234')) {
        phone = phone.substr(0, 11);
    } else if (this.value.startsWith('+234') && phone.length > 13) {
        phone = phone.substr(0, 13);
    }
    this.value = phone;
});
</script>

<!-- Load Google Maps API -->
<script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCYc537bQom7ajFpWE5sQaVyz1SQa9_tuY&callback=initMap"></script>

<%- include('partials/footer') %>