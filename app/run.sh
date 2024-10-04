#!/usr/bin/with-contenv bashio

bashio::log.info "Loading config..."

export DEPARTURE_STATION=$(bashio::config 'DEPARTURE_STATION')

destination_station_list=""
for station_name in $(bashio::config 'DEPARTURE_DESTINATION_STATIONS'); do
    bashio::log.info "Setting departure station: ${station_name}"
    if [ -z "$destination_station_list" ]; then
        destination_station_list="$station_name"
    else
        destination_station_list="$destination_station_list,$station_name"
    fi
done
export DEPARTURE_DESTINATION_STATIONS="$destination_station_list"

destination_categories_map=""
for key in $(bashio::config 'DEPARTURE_DESTINATION_CATEGORIES|keys'); do
    line=$(bashio::config "DEPARTURE_DESTINATION_CATEGORIES[${key}].line")
    category=$(bashio::config "DEPARTURE_DESTINATION_CATEGORIES[${key}].category")
    item="${line}=${category}"
    bashio::log.info "Mapping line to category: ${item}"
    if [ -z "$destination_station_list" ]; then
        destination_categories_map="$item"
    else
        destination_categories_map="$destination_categories_map,$item"
    fi
done
export DEPARTURE_DESTINATION_CATEGORIES="$destination_categories_map"

export DEPARTURE_CONNECTION_LIMIT=$(bashio::config 'DEPARTURE_CONNECTION_LIMIT')

export RENDERING_SCREEN_HEIGHT=$(bashio::config 'RENDERING_SCREEN_HEIGHT')
export RENDERING_SCREEN_WIDTH=$(bashio::config 'RENDERING_SCREEN_WIDTH')

bashio::log.info "Loading additional environment variables..."

# Load custom environment variables
for var in $(bashio::config 'ADDITIONAL_ENV_VARS|keys'); do
    name=$(bashio::config "ADDITIONAL_ENV_VARS[${var}].name")
    value=$(bashio::config "ADDITIONAL_ENV_VARS[${var}].value")
    bashio::log.info "Setting ${name} to ${value}"
    export "${name}=${value}"
done

bashio::log.info "Starting server..."

cd /app
exec /usr/bin/npm start
