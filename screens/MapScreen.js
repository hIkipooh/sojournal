import React from "react";
import {
  AppRegistry,
  Animated,
  Button,
  Dimensions,
  Image,
  Platform,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import './styles'
import { WebBrowser, Component } from "expo";
import { getTheme } from 'react-native-material-kit';
import MapView from "react-native-maps";
import { MonoText } from "../components/StyledText";
import axios from 'axios';
import { connect } from 'react-redux';
import PopupCard from './PopupCard';
import { renderPhotos, changeCardVisibility, selectImageCard } from '../action';

const { width, height } = Dimensions.get("window");
const CARD_HEIGHT = height / 4;
const CARD_WIDTH = CARD_HEIGHT - 50;

let modalContent;


class MapScreen extends React.Component {
  static navigationOptions = {
    header: null
  };
  constructor(props) {
    super(props);
  }


    componentWillMount() {
    this.index = 0;
    this.animation = new Animated.Value(0);
    this.callDatabase()

  }

  componentDidMount() {
    // We should detect when scrolling has stopped then animate
    // We should just debounce the event listener here
    this.animation.addListener(({ value }) => {
      let index = Math.floor(value / CARD_WIDTH + 0.3); // animate 30% away from landing on the next item
      if (index >= this.props.markers.length) {
        index = this.props.markers.length - 1;
      }
      if (index <= 0) {
        index = 0;
      }

      clearTimeout(this.regionTimeout);
      this.regionTimeout = setTimeout(() => {
        if (this.index !== index) {
          this.index = index;
          const { coordinate } = this.props.markers[index];
          this.map.animateToRegion(
            {
              ...coordinate,
              latitudeDelta: this.props.region.latitudeDelta,
              longitudeDelta: this.props.region.longitudeDelta,
            },
            350
          );
        }
      }, 10);
    });

  }

  callDatabase() {
    axios({
      url: 'http://ec2-54-199-164-132.ap-northeast-1.compute.amazonaws.com:4000/graphql',
      method: 'post',
      data: {
        query: `
        query {ReadPhoto(type: {
        }) {
         title, latitude, longitude, comment, imageFile
        }
      }
        `
      }
    }).then(result => {
      const mapResult = result.data.data.ReadPhoto.map(object => (
      {
        coordinate: {
          latitude: Number(object.latitude),
          longitude: Number(object.longitude),
        },
        title: `${object.title}`,
        description: `${object.comment}`,
        image: { uri: `data:image/jpg;base64,${object.imageFile}` }, 
      }
    ));

      for(let i = 0; i < mapResult.length; i++) {
        mapResult[i].index = i;
        this.props.renderPhotos(mapResult[i])
      }
    })
  }

  onPressPopUpButton () {
    this.props.changeCardVisibility(false)
  }
  onPressImageCard (index) {
    const theme = getTheme();    
      this.modalContent = (
      <View style={[theme.cardStyle, styles.popUpCard]}>
          <View style={theme.cardImageStyle}>
            <Image source={this.props.markers[index].image} style={styles.popUpImage} />
          </View>
          <TextInput style={theme.cardContentStyle} value={this.props.markers[index].title} />
          <TextInput style={theme.cardContentStyle} value={this.props.markers[index].description} />
          <Button onPress={this.onPressImageCard} title="EXIT" color="#841584" accessibilityLabel="exit" />
      </View>)

    this.props.changeCardVisibility(true)
    this.props.selectImageCard(index)
  }

  render() {
    const interpolations = this.props.markers.map((marker, index) => {
      const inputRange = [
        (index - 1) * CARD_WIDTH,
        index * CARD_WIDTH,
        ((index + 1) * CARD_WIDTH),
      ];
      const scale = this.animation.interpolate({
        inputRange,
        outputRange: [1, 2.5, 1],
        extrapolate: "clamp",
      });
      const opacity = this.animation.interpolate({
        inputRange,
        outputRange: [0.35, 1, 0.35],
        extrapolate: "clamp",
      });
      return { scale, opacity };
    });

    return (
      <View style={styles.container}>
        <MapView
          ref={map => this.map = map}
          initialRegion={this.props.region}
          style={styles.container}
        >
          {this.props.markers.map((marker, index) => {
            return (
              <MapView.Marker key={index} coordinate={marker.coordinate}>
                <Animated.View style={[styles.markerWrap]}>
                  <Animated.View style={[styles.ring]} />
                  <View style={styles.marker} />
                </Animated.View>
              </MapView.Marker>
            );
          })}
        </MapView>
        <Animated.ScrollView
          horizontal
          scrollEventThrottle={1}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH}
          onScroll={Animated.event(
            [
              {
                nativeEvent: {
                  contentOffset: {
                    x: this.animation,
                  },
                },
              },
            ],
            { useNativeDriver: true }
          )}
          style={styles.scrollView}
          contentContainerStyle={styles.endPadding}
        >
          {/* <Modal style={styles.popUpModal} visible={this.state.visible} transparent={true} animationType="slide" onRequestClose={() => this.setState({ visible:false })}>
            {this.modalContent}
          </Modal> */}
          {this.props.visible && this.modalContent}

        {this.props.markers.map((marker, index) => (
          <TouchableOpacity key={index} onPress={() =>this.onPressImageCard(index)}>
            <View style={styles.card} key={index} >
              <Image
                source={marker.image}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.textContent}>
                <Text numberOfLines={1} style={styles.cardtitle}>{marker.title}</Text>
                <Text numberOfLines={1} style={styles.cardDescription}>
                  {marker.description}
                </Text>
              </View>              
            </View>
          </TouchableOpacity>
        ))}
          
        </Animated.ScrollView>
      </View>
    );
  }
}

const theme = getTheme();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  map: {
    height: 100,
    flex: 1
  },
  scrollView: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    paddingVertical: 10,
  },
  endPadding: {
    paddingRight: width - CARD_WIDTH,
  },
  card: {
    padding: 10,
    elevation: 2,
    backgroundColor: "#FFF",
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowRadius: 5,
    shadowOpacity: 0.3,
    shadowOffset: { x: 2, y: -2 },
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
    overflow: "visible",
  },
  cardImage: {
    flex: 3,
    width: "100%",
    height: "100%",
    alignSelf: "center",
  },
  textContent: {
    flex: 1,
  },
  cardtitle: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: "bold",
  },
  cardDescription: {
    fontSize: 12,
    color: "#444",
  },
  markerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(130,4,150, 0.9)",
  },
  popUpCard: {
    marginTop: 30,
  },
  popUpImage: {
    flex: 1,
  },
  popUpModal: {
    padding: 10,
    elevation: 2,
    backgroundColor: "#FFF",
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowRadius: 5,
    shadowOpacity: 0.3,
    shadowOffset: { x: 2, y: -2 },
    width: CARD_HEIGHT * 2,
    height: CARD_HEIGHT * 2,
    overflow: "visible",
  },
  textInputPopup: {
    width: "100%",
    height: "50%"
  },
  ring: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(130,4,150, 0.3)",
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(130,4,150, 0.5)",
  },
  enlargedPhoto: {
    marginLeft: "auto",
    marginRight: "auto",
    justifyContent: "center",
    alignItems: 'center',
    height: "80%",
    width: "80%",
  },
})

const mapStateToProps = state => ({
  markers: state.markers,
  region: state.region,
  visible: state.visible,
  selectedImage: state.selectedImage
})

const mapDispatchToProps = dispatch => ({
  renderPhotos: photos => {
    const action = renderPhotos(photos);
    dispatch(action)
  },
  changeCardVisibility: visibility => {
    const action = changeCardVisibility(visibility)
    dispatch(action)
  },
  selectImageCard: index => {
    const action = selectImageCard(index)
    dispatch(action)
  }
})

export default connect(mapStateToProps, mapDispatchToProps)(MapScreen)